const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const { load } = require('js-yaml');
const { parse_conference_data } = require('./parse_conference_data.js');


// Mapping from API category names to our area codes
const CATEGORY_MAPPING = {
    'AI': 'AI',    // 人工智能
    'CG': 'CG',    // 计算机图形学
    'CT': 'CT',    // 计算机科学理论
    'DB': 'DB',    // 数据库/数据挖掘/内容检索
    'DS': 'DS',    // 计算机体系结构/并行与分布计算
    'HI': 'HI',    // 人机交互/普适计算
    'MX': 'MX',    // 交叉/综合/新兴
    'NW': 'NW',    // 计算机网络
    'SC': 'SC',    // 网络与信息安全
    'SE': 'SE',    // 软件工程/系统软件/程序设计语言
};

// Base URL for the CCF deadlines API
const BASE_API_URL = 'https://api.github.com/repos/ccfddl/ccf-deadlines/contents/conference';

/**
 * Fetch the list of conference categories from the API
 */
async function fetchCategoryList() {
    try {
        const response = await fetch(`${BASE_API_URL}?ref=main`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Filter out the types.yml file and return only directories
        const categories = data
            .filter(item => item.type === 'dir')
            .map(item => item.name);
        
        console.log('Found categories:', categories);
        return categories;
    } catch (error) {
        console.error('Error fetching category list:', error);
        throw error;
    }
}

/**
 * Fetch conference data for a specific category
 */
async function fetchCategoryData(category) {
    try {
        const response = await fetch(`${BASE_API_URL}/${category}?ref=main`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const files = await response.json();
        
        const ymlFiles = files.filter(file => 
            file.name.endsWith('.yml') && file.type === 'file'
        );
        
        // Create a map with the current category as key
        const conferences = Array();
        
        for (const file of ymlFiles) {
            const fileResponse = await fetch(file.download_url);
            if (!fileResponse.ok) {
                console.warn(`Skipped ${file.name}: ${fileResponse.status}`);
                continue;
            }
            
            const yamlContent = await fileResponse.text();
            const conference = parse_conference_data(yamlContent);
            
            
            conferences.push(conference);
           
        }
        
        return conferences;
    } catch (error) {
        console.error(`Error in ${category}:`, error);
        return { [category]: [] };  // Return empty map entry on error
    }
}

/**
 * Parse YAML content for CCF deadlines format
 * The format: ./conference-yaml-schema.yml, but only remember the last year's conference and other information
 */
function parseYamlContent(yamlContent, category) {
    const conferences = [];
    
    try {
        let data = yaml.load(yamlContent);
        
    } catch (error) {
        console.error(`Error parsing YAML for category ${category}:`, error);
    }
    
    return conferences;
}

/**
 * Save conference data to JSON file
 */
async function saveConferenceData(areaCode, conferences) {
    const sourceDir = 'source';
    
    // Ensure source directory exists
    try {
        await fs.access(sourceDir);
    } catch {
        await fs.mkdir(sourceDir, { recursive: true });
    }
    
    const filePath = path.join(sourceDir, `${areaCode}.json`);
    await fs.writeFile(filePath, JSON.stringify(conferences, null, 2), 'utf8');
    
    console.log(`Saved ${conferences.length} conferences to ${filePath}`);
}

/**
 * Main function to fetch all conference data
 */
async function fetchAllConferenceData() {
    try {
        console.log('Starting to fetch conference data from CCF deadlines API...');
        
        // Get list of categories
        const categories = await fetchCategoryList();
        
        // Process each category
        for (const category of categories) {
            if (!CATEGORY_MAPPING[category]) {
                console.log(`Skipping unmapped category: ${category}`);
                continue;
            }
            
            console.log(`Processing category: ${category} -> ${CATEGORY_MAPPING[category]}`);
            
            // Fetch data for this category
            const conferences = await fetchCategoryData(category);
            
            if (conferences.length > 0) {
                // Save to corresponding area code file
                await saveConferenceData(CATEGORY_MAPPING[category], conferences);
            } else {
                console.warn(`No conferences found for category: ${category}`);
            }
            
            // Add a small delay to be respectful to the API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('Conference data fetch completed successfully!');
        
    } catch (error) {
        console.error('Error in fetchAllConferenceData:', error);
        throw error;
    }
}

/**
 * Fetch data for a specific category only
 */
async function fetchSpecificCategory(category) {
    if (!CATEGORY_MAPPING[category]) {
        throw new Error(`Unknown category: ${category}. Available: ${Object.keys(CATEGORY_MAPPING).join(', ')}`);
    }
    
    console.log(`Fetching data for category: ${category}`);
    const conferences = await fetchCategoryData(category);
    
    if (conferences.length > 0) {
        await saveConferenceData(CATEGORY_MAPPING[category], conferences);
        return conferences;
    } else {
        console.warn(`No conferences found for category: ${category}`);
        return [];
    }
}


module.exports = {
    fetchAllConferenceData,
    fetchSpecificCategory,
    fetchCategoryList,
    CATEGORY_MAPPING
  };

fetchAllConferenceData();
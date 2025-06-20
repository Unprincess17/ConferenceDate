const fs = require('fs');
const path = require('path');

// Define the tags and their corresponding names
const suffix = {
    "/ccf/ccf-1.html": "080101",
    "/ccf/ccf-2.html": "080102",
    "/ccf/ccf-3.html": "080103",
    "/ccf/ccf-4.html": "080104",
    "/ccf/ccf-5.html": "080105",
    "/ccf/ccf-6.html": "080106",
    "/ccf/ccf-7.html": "080107",
    "/ccf/ccf-8.html": "080108",
    "/ccf/ccf-9.html": "080109",
    "/ccf/ccf-10.html": "080110"
};

const name_convention = {
    "080101": "计算机体系结构/高性能计算/存储系统",
    "080102": "计算机网络",
    "080103": "网络信息与安全",
    "080104": "软件工程/系统软件/程序设计语言",
    "080105": "数据库/数据挖掘/内容检索",
    "080106": "计算机科学理论",
    "080107": "计算机图形学与多媒体",
    "080108": "人工智能",
    "080109": "人机交互与普适计算",
    "080110": "交叉/新兴／综合"
};

// Function to fetch data for a specific tag
async function fetchTagData(tag) {
    const url = `https://www.call4papers.cn/dev-api/c4p/homepage/confCcf?field=${tag}`;
    
    try {
        console.log(`Fetching data for tag ${tag} (${name_convention[tag]})...`);
        
        const response = await fetch(url, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-TW;q=0.5",
                "sec-ch-ua": "\"Chromium\";v=\"136\", \"Microsoft Edge\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "Referer": "https://www.call4papers.cn/ccf/ccf-1.html",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Save data to JSON file
        const filePath = path.join('source', `${tag}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`✓ Successfully saved data for tag ${tag} to ${filePath}`);
        return data;
        
    } catch (error) {
        console.error(`✗ Error fetching data for tag ${tag}:`, error.message);
        return null;
    }
}

// Function to fetch all tags
async function fetchAllTags() {
    console.log('Starting to fetch conference data for all tags...\n');
    
    // Ensure source directory exists
    if (!fs.existsSync('source')) {
        fs.mkdirSync('source');
        console.log('Created source directory');
    }
    
    const tags = Object.values(suffix);
    const results = [];
    
    // Fetch data for each tag with a small delay to avoid overwhelming the server
    for (const tag of tags) {
        const data = await fetchTagData(tag);
        results.push({ tag, data, success: data !== null });
        
        // Add a small delay between requests to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n=== Summary ===');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Total tags: ${tags.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
        console.log('\nFailed tags:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`- ${r.tag} (${name_convention[r.tag]})`);
        });
    }
    
    console.log('\nDone!');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.error('This script requires Node.js 18+ or you need to install node-fetch package.');
    console.log('Run: npm install node-fetch');
    process.exit(1);
}

// Run the script
fetchAllTags().catch(console.error); 
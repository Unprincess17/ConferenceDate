let allConferences = [];
let filteredConferences = [];
let selectedConferences = new Set();
let currentSort = { column: 'deadline', direction: 'asc' };
let activeFilters = {
    areas: new Set(),
    ccfTypes: new Set(),
    status: 'upcoming' // 'upcoming', 'passed', or 'all'
};

const areaNames = {
    '080101': 'Computer Architecture',
    '080102': 'Computer Networks',
    '080103': 'Cybersecurity',
    '080104': 'Databases',
    '080105': 'Computer Graphics',
    '080106': 'Human-Computer Interaction',
    '080107': 'Machine Learning',
    '080108': 'Software Engineering',
    '080109': 'Systems Software',
    '080110': 'Theoretical Computer Science'
};

// LocalStorage functions
function saveToStorage() {
    const data = {
        selectedConferences: Array.from(selectedConferences),
        activeFilters: {
            areas: Array.from(activeFilters.areas),
            ccfTypes: Array.from(activeFilters.ccfTypes),
            status: activeFilters.status
        },
        currentSort: currentSort
    };
    localStorage.setItem('conferenceManagerData', JSON.stringify(data));
}

function loadFromStorage() {
    const data = localStorage.getItem('conferenceManagerData');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            selectedConferences = new Set(parsed.selectedConferences || []);
            if (parsed.activeFilters) {
                activeFilters.areas = new Set(parsed.activeFilters.areas || []);
                activeFilters.ccfTypes = new Set(parsed.activeFilters.ccfTypes || []);
                activeFilters.status = parsed.activeFilters.status || 'upcoming';
            }
            if (parsed.currentSort) {
                currentSort = parsed.currentSort;
            }
        } catch (e) {
            console.error('Error loading from storage:', e);
        }
    }
}

async function loadConferenceData() {
    const fileNames = Object.keys(areaNames);
    const promises = fileNames.map(async fileName => {
        try {
            const data = await (await fetch(`/source/${fileName}.json`)).json();
            return data.data.map(conf => ({
                ...conf,
                area: areaNames[fileName],
                areaCode: fileName,
                isPassed: new Date(conf.deadline) < new Date()
            }));
        } catch (error) {
            console.error(`Error loading ${fileName}.json:`, error);
            return [];
        }
    });

    const results = await Promise.all(promises);
    allConferences = results.flat();
    
    // Load saved data
    loadFromStorage();
    
    // Initialize filters
    initializeFilters();
    
    // Set default filters if none saved
    if (activeFilters.areas.size === 0) {
        activeFilters.areas = new Set(Object.values(areaNames));
    }
    if (activeFilters.ccfTypes.size === 0) {
        activeFilters.ccfTypes = new Set([...new Set(allConferences.map(c => c.ccf_type).filter(Boolean))]);
    }
    
    // Update UI
    updateFilterButtons();
    updateStatusButtons();
    filterAndDisplayConferences();
    
    document.getElementById('loadingDiv').style.display = 'none';
    document.getElementById('conferenceTable').style.display = 'table';
}

function initializeFilters() {
    // Initialize area filters
    const areaFiltersContainer = document.getElementById('areaFilters');
    areaFiltersContainer.innerHTML = '';
    Object.values(areaNames).forEach(area => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.textContent = area;
        button.onclick = () => toggleAreaFilter(area);
        areaFiltersContainer.appendChild(button);
    });

    // Initialize CCF filters
    const ccfFiltersContainer = document.getElementById('ccfFilters');
    ccfFiltersContainer.innerHTML = '';
    const ccfTypes = [...new Set(allConferences.map(c => c.ccf_type).filter(Boolean))].sort();
    ccfTypes.forEach(ccfType => {
        const button = document.createElement('button');
        button.className = `filter-btn ccf-${ccfType.toLowerCase()}`;
        button.textContent = `CCF ${ccfType}`;
        button.onclick = () => toggleCcfFilter(ccfType);
        ccfFiltersContainer.appendChild(button);
    });
}

function toggleAreaFilter(area) {
    if (activeFilters.areas.has(area)) {
        activeFilters.areas.delete(area);
    } else {
        activeFilters.areas.add(area);
    }
    updateFilterButtons();
    filterAndDisplayConferences();
    saveToStorage();
}

function toggleCcfFilter(ccfType) {
    if (activeFilters.ccfTypes.has(ccfType)) {
        activeFilters.ccfTypes.delete(ccfType);
    } else {
        activeFilters.ccfTypes.add(ccfType);
    }
    updateFilterButtons();
    filterAndDisplayConferences();
    saveToStorage();
}

function toggleStatusFilter(status) {
    activeFilters.status = status;
    updateStatusButtons();
    filterAndDisplayConferences();
    saveToStorage();
}

function updateFilterButtons() {
    // Update area filter buttons
    Array.from(document.getElementById('areaFilters').children).forEach(button => {
        if (button.textContent && activeFilters.areas.has(button.textContent)) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // Update CCF filter buttons
    Array.from(document.getElementById('ccfFilters').children).forEach(button => {
        const ccfType = button.textContent.replace('CCF ', '');
        if (activeFilters.ccfTypes.has(ccfType)) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function updateStatusButtons() {
    document.getElementById('upcomingBtn').classList.toggle('active', activeFilters.status === 'upcoming');
    document.getElementById('passedBtn').classList.toggle('active', activeFilters.status === 'passed');
}

function filterAndDisplayConferences() {
    filteredConferences = allConferences.filter(conf => {
        const areaMatch = activeFilters.areas.has(conf.area);
        const ccfMatch = activeFilters.ccfTypes.has(conf.ccf_type);
        
        let statusMatch = true;
        if (activeFilters.status === 'upcoming') {
            statusMatch = !conf.isPassed;
        } else if (activeFilters.status === 'passed') {
            statusMatch = conf.isPassed;
        }
        
        return areaMatch && ccfMatch && statusMatch;
    });

    sortConferences();
    displayConferences();
    updateStats();
}

function sortConferences() {
    filteredConferences.sort((a, b) => {
        let aVal = a[currentSort.column];
        let bVal = b[currentSort.column];

        if (currentSort.column === 'deadline') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    // Update header styling
    document.querySelectorAll('th').forEach(th => {
        th.className = th.className.replace(/sort-(asc|desc)/, '');
        if (th.classList.contains('sortable')) {
            // Keep sortable class
        }
    });

    const currentHeader = document.querySelector(`th[onclick*="${column}"]`);
    if (currentHeader) {
        currentHeader.classList.add(`sort-${currentSort.direction}`);
    }

    sortConferences();
    displayConferences();
    saveToStorage();
}

function displayConferences() {
    const tbody = document.getElementById('conferenceTableBody');
    tbody.innerHTML = '';

    filteredConferences.forEach(conf => {
        const row = document.createElement('tr');
        
        const deadlineDate = new Date(conf.deadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
        
        let deadlineClass = 'deadline-normal';
        if (daysUntil < 0) {
            deadlineClass = 'deadline-urgent';
        } else if (daysUntil < 30) {
            deadlineClass = 'deadline-soon';
        }

        // Add passed class for styling
        if (conf.isPassed) {
            row.classList.add('passed-row');
        }

        row.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" onchange="toggleConferenceSelection('${conf.conf_id}')" 
                       ${selectedConferences.has(conf.conf_id.toString()) ? 'checked' : ''}>
            </td>
            <td class="deadline-cell ${deadlineClass}">
                ${formatDate(conf.deadline)}
                <div style="font-size: 0.8em; color: #7f8c8d;">
                    ${daysUntil >= 0 ? `${daysUntil} days left` : `${Math.abs(daysUntil)} days ago`}
                </div>
            </td>
            <td class="conference-name">
                <strong>${conf.full}</strong>
                ${conf.shortName ? `<div class="conference-full">${conf.shortName}</div>` : ''}
            </td>
            <td>${conf.year}</td>
            <td><span class="ccf-badge ccf-${conf.ccf_type ? conf.ccf_type.toLowerCase() : 'other'}">${conf.ccf_type || 'N/A'}</span></td>
            <td><span class="area-badge">${conf.area}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function toggleConferenceSelection(confId) {
    if (selectedConferences.has(confId)) {
        selectedConferences.delete(confId);
    } else {
        selectedConferences.add(confId);
    }
    updateExportButton();
    updateSelectAllCheckbox();
    saveToStorage();
}

function toggleSelectAll() {
    const visibleConfIds = filteredConferences.map(c => c.conf_id.toString());
    const allVisibleSelected = visibleConfIds.every(id => selectedConferences.has(id));
    
    if (allVisibleSelected) {
        // Unselect all visible
        visibleConfIds.forEach(id => selectedConferences.delete(id));
    } else {
        // Select all visible
        visibleConfIds.forEach(id => selectedConferences.add(id));
    }
    
    displayConferences();
    updateExportButton();
    updateSelectAllCheckbox();
    saveToStorage();
}

function clearSelections() {
    selectedConferences.clear();
    displayConferences();
    updateExportButton();
    updateSelectAllCheckbox();
    saveToStorage();
}

function updateSelectAllCheckbox() {
    const visibleConfIds = filteredConferences.map(c => c.conf_id.toString());
    const allVisibleSelected = visibleConfIds.every(id => selectedConferences.has(id));
    const someVisibleSelected = visibleConfIds.some(id => selectedConferences.has(id));
    
    const checkbox = document.getElementById('selectAllCheckbox');
    checkbox.checked = allVisibleSelected;
    checkbox.indeterminate = someVisibleSelected && !allVisibleSelected;
}

function updateExportButton() {
    const exportBtn = document.getElementById('exportBtn');
    exportBtn.disabled = selectedConferences.size === 0;
    exportBtn.textContent = `Export Selected to Calendar (.ics) ${selectedConferences.size > 0 ? `(${selectedConferences.size})` : ''}`;
}

function updateStats() {
    const statsBar = document.getElementById('statsBar');
    const totalConferences = allConferences.length;
    const upcomingConferences = allConferences.filter(c => !c.isPassed).length;
    const passedConferences = allConferences.filter(c => c.isPassed).length;
    const visibleConferences = filteredConferences.length;
    const selectedCount = selectedConferences.size;
    
    statsBar.innerHTML = `
        <span>📊 Total: ${totalConferences} (${upcomingConferences} upcoming, ${passedConferences} passed) | Visible: ${visibleConferences} | Selected: ${selectedCount}</span>
        <span>🔍 Filters: ${activeFilters.areas.size} areas, ${activeFilters.ccfTypes.size} CCF types, ${activeFilters.status}</span>
    `;
}

function exportToICS() {
    if (selectedConferences.size === 0) return;

    const selectedConfs = allConferences.filter(c => selectedConferences.has(c.conf_id.toString()));
    
    // Group conferences by CCF type and area
    const groups = {};
    selectedConfs.forEach(conf => {
        const ccfType = conf.ccf_type || 'Other';
        const area = conf.area;
        const groupKey = `${ccfType}-${area}`;
        
        if (!groups[groupKey]) {
            groups[groupKey] = {
                ccfType: ccfType,
                area: area,
                conferences: []
            };
        }
        groups[groupKey].conferences.push(conf);
    });

    // Sort groups by CCF rank (A=0, B=1, C=2, Other=3)
    const ccfRank = { 'A': 0, 'B': 1, 'C': 2, 'Other': 3 };
    const sortedGroups = Object.values(groups).sort((a, b) => {
        const rankA = ccfRank[a.ccfType] ?? 3;
        const rankB = ccfRank[b.ccfType] ?? 3;
        if (rankA !== rankB) return rankA - rankB;
        return a.area.localeCompare(b.area);
    });
    
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Conference Deadline Manager//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ].join('\r\n');

    sortedGroups.forEach((group, groupIndex) => {
        group.conferences.forEach(conf => {
            const deadline = new Date(conf.deadline);
            // Set to midnight local time (00:00:00) if no specific time is given
            deadline.setHours(0, 0, 0, 0);
            
            // Format date as local date without timezone (DTSTART;VALUE=DATE format)
            const year = deadline.getFullYear();
            const month = String(deadline.getMonth() + 1).padStart(2, '0');
            const day = String(deadline.getDate()).padStart(2, '0');
            const deadlineStr = `${year}${month}${day}`;
            
            // Create conference abbreviation - use shortName if available, otherwise first word of full name
            const confAbbr = conf.shortName || conf.full.split(' ')[0];
            const summary = `${confAbbr}(${conf.ccf_type || 'N/A'})`;
            
            icsContent += '\r\n' + [
                'BEGIN:VEVENT',
                `UID:${conf.conf_id}@conference-deadline-manager`,
                `DTSTART;VALUE=DATE:${deadlineStr}`,
                `DTEND;VALUE=DATE:${deadlineStr}`,
                `SUMMARY:${summary} - Deadline`,
                `DESCRIPTION:Conference: ${conf.full}\\nAbbreviation: ${confAbbr}\\nYear: ${conf.year}\\nCCF Type: ${conf.ccf_type || 'N/A'}\\nArea: ${conf.area}\\nGroup: ${groupIndex} (${group.ccfType} - ${group.area})\\nDeadline: ${formatDate(conf.deadline)}`,
                `CATEGORIES:Group-${groupIndex},${conf.area},CCF-${conf.ccf_type || 'Other'}`,
                `LOCATION:${conf.area}`,
                'BEGIN:VALARM',
                'TRIGGER:-P7D',
                'ACTION:DISPLAY',
                `DESCRIPTION:Reminder: ${summary} deadline in 7 days`,
                'END:VALARM',
                'END:VEVENT'
            ].join('\r\n');
        });
    });

    icsContent += '\r\nEND:VCALENDAR';

    // Download the file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `conference-deadlines-${new Date().toISOString().split('T')[0]}.ics`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', loadConferenceData); 
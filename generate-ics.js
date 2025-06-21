const fs = require('fs');
const path = require('path');

// Research area definitions
const areaDefinitions = {
    '080101': {
        name: 'Computer Architecture / High Performance Computing / Storage Systems',
        shortName: 'Architecture-HPC',
        nameEn: 'Computer Architecture'
    },
    '080102': {
        name: 'Computer Networks',
        shortName: 'Networks',
        nameEn: 'Computer Networks'
    },
    '080103': {
        name: 'Network Security & Information Security',
        shortName: 'Security',
        nameEn: 'Cybersecurity'
    },
    '080104': {
        name: 'Software Engineering / System Software / Programming Languages',
        shortName: 'Software-Eng',
        nameEn: 'Software Engineering'
    },
    '080105': {
        name: 'Database / Data Mining / Information Retrieval',
        shortName: 'Database-Mining',
        nameEn: 'Databases'
    },
    '080106': {
        name: 'Computer Science Theory',
        shortName: 'Theory',
        nameEn: 'Theoretical Computer Science'
    },
    '080107': {
        name: 'Computer Graphics & Multimedia',
        shortName: 'Graphics-Media',
        nameEn: 'Computer Graphics'
    },
    '080108': {
        name: 'Artificial Intelligence',
        shortName: 'AI',
        nameEn: 'Machine Learning'
    },
    '080109': {
        name: 'Human-Computer Interaction & Pervasive Computing',
        shortName: 'HCI-Pervasive',
        nameEn: 'Human-Computer Interaction'
    },
    '080110': {
        name: 'Interdisciplinary / Emerging / Comprehensive',
        shortName: 'Interdisciplinary',
        nameEn: 'Interdisciplinary'
    }
};

function generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDateForICS(dateStr) {
    const date = new Date(dateStr);
    // Set to midnight local time
    date.setHours(0, 0, 0, 0);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function escapeICSText(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
}

function generateICSForArea(areaCode, conferences) {
    const area = areaDefinitions[areaCode];
    if (!area) return null;

    // Filter for upcoming conferences only
    const upcomingConferences = conferences.filter(conf => {
        const deadline = new Date(conf.deadline);
        const now = new Date();
        return deadline >= now;
    });

    // Sort by deadline
    upcomingConferences.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    const calendarName = `${area.shortName} Conference Deadlines`;
    const calendarDescription = `Conference deadlines for ${area.name}`;
    
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:-//Conference Deadline Manager//${calendarName}//EN`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeICSText(calendarName)}`,
        `X-WR-CALDESC:${escapeICSText(calendarDescription)}`,
        'X-WR-TIMEZONE:UTC'
    ].join('\r\n');

    upcomingConferences.forEach(conf => {
        const deadline = formatDateForICS(conf.deadline);
        const confAbbr = conf.shortName || conf.full.split(' ')[0];
        const summary = `${confAbbr} (${conf.ccf_type || 'N/A'}) - Deadline`;
        
        const description = [
            `Conference: ${conf.full}`,
            `Abbreviation: ${confAbbr}`,
            `Year: ${conf.year}`,
            `CCF Type: ${conf.ccf_type || 'N/A'}`,
            `Area: ${area.nameEn}`,
            `Deadline: ${formatDate(conf.deadline)}`,
            ``,
            `Auto-generated from Conference Deadline Manager`,
            `Last updated: ${new Date().toISOString().split('T')[0]}`
        ].join('\\n');

        icsContent += '\r\n' + [
            'BEGIN:VEVENT',
            `UID:${conf.conf_id}-${areaCode}@conference-deadline-manager`,
            `DTSTART;VALUE=DATE:${deadline}`,
            `DTEND;VALUE=DATE:${deadline}`,
            `SUMMARY:${escapeICSText(summary)}`,
            `DESCRIPTION:${escapeICSText(description)}`,
            `CATEGORIES:${escapeICSText(area.nameEn)},CCF-${conf.ccf_type || 'Other'}`,
            `LOCATION:${escapeICSText(area.nameEn)}`,
            'STATUS:CONFIRMED',
            'TRANSP:TRANSPARENT',
            // 7-day reminder
            'BEGIN:VALARM',
            'TRIGGER:-P7D',
            'ACTION:DISPLAY',
            `DESCRIPTION:${escapeICSText(`Reminder: ${confAbbr} deadline in 7 days`)}`,
            'END:VALARM',
            // 1-day reminder
            'BEGIN:VALARM',
            'TRIGGER:-P1D',
            'ACTION:DISPLAY',
            `DESCRIPTION:${escapeICSText(`Final reminder: ${confAbbr} deadline tomorrow!`)}`,
            'END:VALARM',
            'END:VEVENT'
        ].join('\r\n');
    });

    icsContent += '\r\nEND:VCALENDAR';
    return icsContent;
}

function generateAllAreaICS(conferences) {
    const allUpcoming = conferences.filter(conf => {
        const deadline = new Date(conf.deadline);
        const now = new Date();
        return deadline >= now;
    });

    // Sort by deadline
    allUpcoming.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    const calendarName = 'All CS Conference Deadlines';
    const calendarDescription = 'All upcoming computer science conference deadlines across all research areas';
    
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:-//Conference Deadline Manager//${calendarName}//EN`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeICSText(calendarName)}`,
        `X-WR-CALDESC:${escapeICSText(calendarDescription)}`,
        'X-WR-TIMEZONE:UTC'
    ].join('\r\n');

    allUpcoming.forEach(conf => {
        const deadline = formatDateForICS(conf.deadline);
        const confAbbr = conf.shortName || conf.full.split(' ')[0];
        const area = areaDefinitions[conf.areaCode];
        const summary = `${confAbbr} (${conf.ccf_type || 'N/A'}) - ${area ? area.shortName : 'Unknown'}`;
        
        const description = [
            `Conference: ${conf.full}`,
            `Abbreviation: ${confAbbr}`,
            `Year: ${conf.year}`,
            `CCF Type: ${conf.ccf_type || 'N/A'}`,
            `Area: ${area ? area.nameEn : 'Unknown'}`,
            `Deadline: ${formatDate(conf.deadline)}`,
            ``,
            `Auto-generated from Conference Deadline Manager`,
            `Last updated: ${new Date().toISOString().split('T')[0]}`
        ].join('\\n');

        icsContent += '\r\n' + [
            'BEGIN:VEVENT',
            `UID:${conf.conf_id}-all@conference-deadline-manager`,
            `DTSTART;VALUE=DATE:${deadline}`,
            `DTEND;VALUE=DATE:${deadline}`,
            `SUMMARY:${escapeICSText(summary)}`,
            `DESCRIPTION:${escapeICSText(description)}`,
            `CATEGORIES:${escapeICSText(area ? area.nameEn : 'Unknown')},CCF-${conf.ccf_type || 'Other'}`,
            `LOCATION:${escapeICSText(area ? area.nameEn : 'Unknown')}`,
            'STATUS:CONFIRMED',
            'TRANSP:TRANSPARENT',
            // 7-day reminder
            'BEGIN:VALARM',
            'TRIGGER:-P7D',
            'ACTION:DISPLAY',
            `DESCRIPTION:${escapeICSText(`Reminder: ${confAbbr} deadline in 7 days`)}`,
            'END:VALARM',
            // 1-day reminder
            'BEGIN:VALARM',
            'TRIGGER:-P1D',
            'ACTION:DISPLAY',
            `DESCRIPTION:${escapeICSText(`Final reminder: ${confAbbr} deadline tomorrow!`)}`,
            'END:VALARM',
            'END:VEVENT'
        ].join('\r\n');
    });

    icsContent += '\r\nEND:VCALENDAR';
    return icsContent;
}

async function main() {
    console.log('🗓️  Generating ICS files for all research areas...\n');

    // Ensure ics directory exists
    const icsDir = path.join(__dirname, 'ics');
    if (!fs.existsSync(icsDir)) {
        fs.mkdirSync(icsDir, { recursive: true });
        console.log('Created ics directory');
    }

    // Load all conference data
    const allConferences = [];
    const areaCodes = Object.keys(areaDefinitions);
    
    for (const areaCode of areaCodes) {
        const filePath = path.join('source', `${areaCode}.json`);
        
        if (fs.existsSync(filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const conferences = data.data.map(conf => ({
                    ...conf,
                    areaCode: areaCode,
                    area: areaDefinitions[areaCode].nameEn,
                    isPassed: new Date(conf.deadline) < new Date()
                }));
                
                allConferences.push(...conferences);
                
                // Generate individual area ICS file
                const icsContent = generateICSForArea(areaCode, conferences);
                if (icsContent) {
                    const filename = `${areaDefinitions[areaCode].shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`;
                    const filepath = path.join(icsDir, filename);
                    fs.writeFileSync(filepath, icsContent, 'utf8');
                    
                    const upcomingCount = conferences.filter(c => !c.isPassed).length;
                    console.log(`✓ ${areaDefinitions[areaCode].shortName}: ${upcomingCount} upcoming conferences → ${filename}`);
                }
            } catch (error) {
                console.error(`✗ Error processing ${areaCode}:`, error.message);
            }
        } else {
            console.warn(`⚠️  File not found: ${filePath}`);
        }
    }

    // Generate combined "all areas" ICS file
    const allICSContent = generateAllAreaICS(allConferences);
    const allFilepath = path.join(icsDir, 'all-conferences.ics');
    fs.writeFileSync(allFilepath, allICSContent, 'utf8');
    
    const totalUpcoming = allConferences.filter(c => !c.isPassed).length;
    console.log(`✓ All Areas: ${totalUpcoming} upcoming conferences → all-conferences.ics`);

    // Generate README with subscription URLs
    const readmeContent = generateReadme();
    fs.writeFileSync(path.join(icsDir, 'README.md'), readmeContent, 'utf8');
    console.log(`✓ Generated README.md with subscription URLs`);

    console.log('\n🎉 ICS generation completed!');
    console.log(`📁 Files generated in: ${icsDir}`);
    console.log(`🔗 Subscribe to calendars using the raw GitHub URLs in ics/README.md`);
}

function generateReadme() {
    // GitHub Pages URL format: https://USERNAME.github.io/REPO_NAME/ics/
    const repoUrl = 'https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/ics';
    
    let content = `# Conference Calendar Subscriptions

These ICS files are automatically updated daily and can be subscribed to in your calendar application.

**📍 Note**: Update the URLs below by replacing \`YOUR_USERNAME\` and \`YOUR_REPO_NAME\` with your actual GitHub username and repository name.

**🏠 Main Website**: [https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/](https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/)

## 📅 Individual Research Areas

| Research Area | Upcoming Conferences | Subscription URL |
|---|---|---|
`;

    Object.entries(areaDefinitions).forEach(([code, area]) => {
        const filename = `${area.shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`;
        content += `| ${area.name} | [Subscribe](${repoUrl}/${filename}) | \`${repoUrl}/${filename}\` |\n`;
    });

    content += `
## 📅 All Areas Combined

| Calendar | Description | Subscription URL |
|---|---|---|
| All CS Conferences | All upcoming deadlines across all research areas | \`${repoUrl}/all-conferences.ics\` |

## 🔗 How to Subscribe

### iCloud Calendar (iOS/macOS)
1. Copy the subscription URL from above
2. Open Calendar app
3. Go to File → New Calendar Subscription (macOS) or Settings → Accounts → Add Account → Other → Add CalDAV Account (iOS)
4. Paste the URL and click Subscribe
5. Choose refresh frequency (recommended: Daily)

### Google Calendar
1. Open Google Calendar
2. Click the "+" next to "Other calendars"
3. Select "From URL"
4. Paste the subscription URL
5. Click "Add calendar"

### Outlook
1. Open Outlook
2. Go to Calendar
3. Click "Add calendar" → "Subscribe from web"
4. Paste the subscription URL
5. Click "Import"

## ⚡ Auto-Updates

These calendars are automatically updated daily at 6:00 AM UTC with the latest conference information.

## 📊 Calendar Features

- 📅 Only upcoming conference deadlines (past deadlines are automatically removed)
- 🔔 Built-in reminders: 7 days and 1 day before deadline
- 🏷️ Categorized by research area and CCF ranking
- 📝 Detailed event descriptions with full conference information
- 🌍 UTC timezone for universal compatibility

---

*Last updated: ${new Date().toISOString().split('T')[0]}*  
*Generated automatically by [Conference Deadline Manager](../README.md)*
`;

    return content;
}

// Run the script
main().catch(console.error); 
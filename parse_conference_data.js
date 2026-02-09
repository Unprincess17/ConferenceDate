const { load } = require('js-yaml');

function parse_conference_data(yaml_content) {
    try {
        const conference_data = load(yaml_content)[0];
        // shared fields: title, description, sub, rank, dblp
        // yearly fields: confs
        // 1. deep copy the confs
        const confs = JSON.parse(JSON.stringify(conference_data.confs));

        // 2. get the conf of last year
        // Note: Ensure confs is an array before sorting
        const last_year_conf = Array.from(confs).sort((a, b) => a.year - b.year)[confs.length - 1];

        // 3. drop the confs from the conference_data
        delete conference_data.confs;
        conference_data.confs = last_year_conf;

        // console.log(conference_data); // Optional: reduce logs in CI
        return conference_data;
    } catch (error) {
        console.error('Error parsing conference data:', error.message);
        return null;
    }
}

// Export the function using CommonJS syntax
module.exports = { parse_conference_data };

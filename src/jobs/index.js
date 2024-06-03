const path = require("path");
module.exports = {
    ListMagnusClients: require(path.resolve("src/jobs/ListMagnusClients")),
    SearchContracts: require(path.resolve("src/jobs/SearchContracts"))
}

// const path = require('path');
// const fs = require('fs');

// const jobs = {};

// fs.readdirSync(__dirname).forEach(file => {
//     if (file !== 'index.js') {
//         const jobPath = path.resolve(__dirname, file);
//         if (fs.lstatSync(jobPath).isFile() && path.extname(file) === '.js') {
//             const job = require(jobPath);
//             const caller = module.parent ? module.parent.filename : '';

//             if (!caller.includes(jobPath)) {
//                 jobs[job.key] = job;
//             }
//         }
//     }
// });

// module.exports = jobs;
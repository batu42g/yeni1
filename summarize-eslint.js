const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));

const ruleTally = {};
let totalErrors = 0;
let totalWarnings = 0;

report.forEach(file => {
    file.messages.forEach(msg => {
        const key = msg.ruleId || 'syntax-error';
        if (!ruleTally[key]) ruleTally[key] = 0;
        ruleTally[key]++;
        if (msg.severity === 2) totalErrors++;
        else totalWarnings++;
    });
});

console.log(`Total Errors: ${totalErrors}, Warnings: ${totalWarnings}`);
console.log(Object.entries(ruleTally).sort((a, b) => b[1] - a[1]).map(e => `${e[0]}: ${e[1]}`).join('\n'));

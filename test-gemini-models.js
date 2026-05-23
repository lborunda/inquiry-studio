const apiKey = process.env.GEMINI_API_KEY;
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(endpoint)
.then(res => res.json())
.then(data => {
    const models = data.models.filter(m => JSON.stringify(m).includes("IMAGE") || JSON.stringify(m).includes("image") || JSON.stringify(m).includes("gen")).map(m => m.name);
    console.log(models);
})
.catch(err => console.error(err));

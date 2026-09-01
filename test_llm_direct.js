const { OpenAI } = require('openai');
const fs = require('fs');

async function test() {
    const nvidiaAi = new OpenAI({
        apiKey: process.env.NVIDIA_API_KEY,
        baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    const persona = fs.readFileSync('backend/prompts/eduavatar_persona_system.txt', 'utf8');
    const conversational = fs.readFileSync('backend/prompts/conversational_teaching_system.txt', 'utf8');

    const systemMessage = `--- REAL-TIME CONVERSATIONAL ENGINE ---\n${conversational}\n\n--- PERSONA ---\n${persona}`;

    const completion = await nvidiaAi.chat.completions.create({
        model: "meta/llama-3.1-70b-instruct",
        messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: "I'm having a lot of trouble understanding Newton's Third Law. It doesn't make sense that a wall pushes back on me." }
        ],
        temperature: 0.6,
        max_tokens: 1024
    });

    console.log("\n====== EDUAVATAR'S CONVERSATIONAL RESPONSE ======\n");
    console.log(completion.choices[0].message.content);
    console.log("\n=================================================");
}

test();

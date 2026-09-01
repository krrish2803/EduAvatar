async function run() {
    try {
        console.log("Sending message to EduAvatar...");
        const res = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "I'm having a lot of trouble understanding Newton's Third Law. It doesn't make sense that a wall pushes back on me.",
                studentLevel: "Beginner",
                language: "English"
            })
        });
        
        const data = await res.json();
        console.log("\n====== EDUAVATAR'S RESPONSE ======\n");
        console.log(data.reply);
        console.log("\n==================================");
    } catch (e) {
        console.error("Test failed:", e.message);
    }
}
run();

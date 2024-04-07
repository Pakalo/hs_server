async function generateUniqueGameCode() {
    const codeLength = 6;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    while (true) {
        const generatedCode = Array.from({ length: codeLength }, () => characters[Math.floor(Math.random() * characters.length)]).join('');

        // Check if the generated code already exists in the database
        const existingRoom = await Room.findOne({
            where: {
                gameCode: generatedCode,
            },
        });

        if (!existingRoom) {
            return generatedCode.toString();  // Ensure the generatedCode is converted to a string
        }
    }
}

module.exports = generateUniqueGameCode;
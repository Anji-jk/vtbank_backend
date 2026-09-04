import bcrypt from 'bcrypt';
import generator from "generate-password";

const SALT_ROUNDS = 10;

export const hashPassword = async (plainPassword) => {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const comparePassword = async (plainPassword, hashPassword) => {
    return bcrypt.compare(plainPassword, hashPassword)
};

export const isStrongPassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    return regex.test(password);
}


export const generateRandomPassword = (length = 10) => {
    const password = generator.generate({
        length: 16,
        numbers: true,
        symbols: true,
        uppercase: true,
        lowercase: true,
        strict: true, // Ensures at least one of each selected type
        excludeSimilarCharacters: true, 
        exclude: "()[]{}<>",
    });
    return password;
};

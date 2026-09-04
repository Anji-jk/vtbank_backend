import { verifyToken } from "../utils/jwt.util.js";

export const authMiddleware = async(req, res, next) => {
    try{
        // read from cookie
        const accessToken = req.cookies.accessToken;

        if(!accessToken){
            return res.status(401).send("Authentication required!!");
        }

        // verify jwt
        const decoded = verifyToken(accessToken);
        console.log("decode:",decoded);
        req.user = decoded;
        next();

    }
    catch(err){
        return res.status(401).send("Invalid or expired token.")
    }

}
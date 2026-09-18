const jwt = require("jsonwebtoken")
const config = require("../config/env")

function generateAccessToken({userId,role,sessionId}) {
    return jwt.sign({userId,role,sessionId,
            type:"access"
        },
        config.jwt.accessSecret,
        {
            expiresIn:config.jwt.accessExpiresIn
        }
    )
}
function generateRefreshToken({userId,sessionId}) {
    return jwt.sign({userId,sessionId,
            type:"refresh"
        },
        config.jwt.refreshSecret,
        {
            expiresIn:config.jwt.refreshExpiresIn
        }
    )
}
function verifyAccessToken(token){
    return jwt.verify(token,config.jwt.accessSecret)
}
function verifyRefreshToken(token){
    return jwt.verify(token,config.jwt.refreshSecret)
}
module.exports={
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
}

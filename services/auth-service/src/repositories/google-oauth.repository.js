const {pool}= require("../config/database")

async function findOrCreateUser(googleId,email) {
    const client= await pool.connect();
    try{
        // Checking either the email already linked with email or not .
        await client.query("BEGIN")
        const existingGoogleAccount = await client.query(
            `
            SELECT
            u.id,
            u.email,
            u.role,
            u.status,
            u.email_verified_at,
            u.created_at,
            u.updated_at
            from oauth_accounts oa
            JOIN users u 
            on u.id = oa.user_id
            where oa.provider = $1
            AND oa.provider_account_id=$2
            limit 1
            `,
            ["google",googleId]
        )
        if(existingGoogleAccount.rows.length>0){
            await client.query("COMMIT")
            return{
                user:existingGoogleAccount.rows[0],
                created:false,
                requiresLinking:false
            }
        }
        const existingUser = await client.query(
            `
            SELECT id
            FROM users
            where email=$1
            `,
            [email]
        )
        if (existingUser.rows.length > 0) {
            await client.query("ROLLBACK");
            return {
            user:null,
            created:false,
            requiresLinking:true
            }
        }
        // Create new user

        const userResult = await client.query(
            ` 
                INSERT INTO users 
                (email,password_hash,role,email_verified_at)
                VALUES ($1, NULL, $2, CURRENT_TIMESTAMP)
                RETURNING
                id,
                email,
                role,
                status,
                email_verified_at,
                created_at,
                updated_at
            `,
            [email,"CUSTOMER"]
        )
        const user = userResult.rows[0];
        await client.query(
            `
            INSERT INTO oauth_accounts
            (
                user_id,
                provider,
                provider_account_id
            )
            VALUES ($1,$2,$3)

            `,
            [user.id,"google",googleId]
        )
        await client.query("COMMIT")
        return {
            user,
            created:true,
            requiresLinking:false
        }
        
        
    }
    catch (error) {
        try {
        await client.query("ROLLBACK");
        } catch (rollbackError) {
        // Preserve the original error.
        }
        throw new error;
    } 
    finally {
        client.release();
    }
}

module.exports = {
  findOrCreateUser,
};    

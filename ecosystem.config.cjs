module.exports = {
    apps: [
        {
            name: 'trade-center-api',
            script: './server/index.js',
            env: {
                NODE_ENV: 'production',
                PORT: 3001,
                ADMIN_PASSWORD: 'admin123' // User should change this in the real server .env
            }
        }
    ]
};

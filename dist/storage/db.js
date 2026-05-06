"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.closePool = closePool;
exports.runMigration = runMigration;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let pool = null;
function getPool() {
    if (!pool) {
        const config = {
            connectionString: process.env.DATABASE_URL || 'postgres://agent:agent_secret@localhost:5432/research_agent',
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };
        pool = new pg_1.Pool(config);
        pool.on('error', (err) => {
            console.error('Unexpected error on idle DB client', err);
        });
    }
    return pool;
}
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
async function runMigration(sql) {
    const client = await getPool().connect();
    try {
        await client.query(sql);
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=db.js.map
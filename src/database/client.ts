
import { dbResult, initDatabase } from './schema';

export const getDB = () => dbResult;
export const databaseInit = initDatabase;

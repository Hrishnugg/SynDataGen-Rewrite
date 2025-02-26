"use strict";
/**
 * Migration Example Script
 *
 * This script demonstrates how to use the migration utilities to
 * migrate data from MongoDB to Firestore.
 *
 * Required environment variables:
 * - MONGODB_URI: MongoDB connection string
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to GCP service account key JSON file
 *
 * Optional environment variables:
 * - SOURCE_COLLECTION: MongoDB collection to migrate (default: "users")
 * - DEST_COLLECTION: Firestore collection to write to (default: same as SOURCE_COLLECTION)
 * - BATCH_SIZE: Number of documents to process in a batch (default: 100)
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongodb_1 = require("mongodb");
var migration_1 = require("../lib/migration");
var firestoreTools = __importStar(require("../lib/migration/firestore"));
// Setup environment variables
try {
    // Try to load environment variables from dotenv
    require('dotenv').config();
}
catch (error) {
    console.warn('dotenv not installed. Using environment variables directly.');
}
// Validate required environment variables
if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required');
}
// Firestore requires authentication
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
    console.warn('Firestore operations will likely fail unless you are already authenticated via gcloud CLI.');
    console.warn('Set this variable to the path of your service account key file for proper authentication.');
}
/**
 * Setup MongoDB and Firestore connections
 */
function setupConnections() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // Check for required MongoDB environment variables
                    if (!process.env.MONGODB_URI) {
                        throw new Error('MONGODB_URI environment variable is not set. ' +
                            'This is required for MongoDB connection.');
                    }
                    // Firestore initialization
                    return [4 /*yield*/, firestoreTools.initializeFirestore()];
                case 1:
                    // Firestore initialization
                    _a.sent();
                    console.log('Firestore connection initialized');
                    return [2 /*return*/, true];
                case 2:
                    error_1 = _a.sent();
                    console.error('Failed to set up connections:', error_1.message);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Print MongoDB collection statistics
 */
function printCollectionStats(db) {
    return __awaiter(this, void 0, void 0, function () {
        var collections, _i, collections_1, collection, name_1, count, error_2, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    return [4 /*yield*/, db.collections()];
                case 1:
                    collections = _a.sent();
                    console.log('\nCollection Statistics:');
                    _i = 0, collections_1 = collections;
                    _a.label = 2;
                case 2:
                    if (!(_i < collections_1.length)) return [3 /*break*/, 7];
                    collection = collections_1[_i];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    name_1 = collection.collectionName;
                    return [4 /*yield*/, collection.countDocuments()];
                case 4:
                    count = _a.sent();
                    console.log("- ".concat(name_1, ": ").concat(count, " documents"));
                    return [3 /*break*/, 6];
                case 5:
                    error_2 = _a.sent();
                    console.error("Error getting stats for collection: ".concat(collection.collectionName), error_2.message);
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_3 = _a.sent();
                    console.error('Error retrieving collections:', error_3.message);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Main migration function
 */
function runMigration() {
    return __awaiter(this, void 0, void 0, function () {
        var client, initialized, uri, db, sourceColl, collection, count, batchSize, limit, docs, transformer, migrationResults, firestoreReady, destCollection, firestoreResults, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = null;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, 11, 14]);
                    return [4 /*yield*/, setupConnections()];
                case 2:
                    initialized = _a.sent();
                    if (!initialized) {
                        throw new Error('Failed to initialize connections');
                    }
                    uri = process.env.MONGODB_URI;
                    if (!uri) {
                        throw new Error('MONGODB_URI environment variable is not set');
                    }
                    client = new mongodb_1.MongoClient(uri);
                    return [4 /*yield*/, client.connect()];
                case 3:
                    _a.sent();
                    console.log('Connected to MongoDB');
                    db = client.db();
                    // Print collection statistics
                    return [4 /*yield*/, printCollectionStats(db)];
                case 4:
                    // Print collection statistics
                    _a.sent();
                    sourceColl = process.env.SOURCE_COLLECTION || 'users';
                    collection = db.collection(sourceColl);
                    console.log("\nSelected collection for migration: ".concat(sourceColl));
                    return [4 /*yield*/, collection.countDocuments()];
                case 5:
                    count = _a.sent();
                    console.log("Total documents in ".concat(sourceColl, ": ").concat(count));
                    batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
                    limit = Math.min(count, batchSize);
                    console.log("Migrating first ".concat(limit, " documents as a test batch"));
                    return [4 /*yield*/, collection.find({}).limit(limit).toArray()];
                case 6:
                    docs = _a.sent();
                    transformer = function (doc) {
                        // Create a clean version of the document for Firestore
                        var transformed = __assign({}, doc);
                        // Convert MongoDB _id to Firestore id
                        if (transformed._id) {
                            transformed.id = transformed._id.toString();
                            delete transformed._id;
                        }
                        // Add migration metadata
                        transformed.migratedAt = new Date();
                        transformed.migrationSource = 'mongodb';
                        return transformed;
                    };
                    // Validate data and transform
                    console.log('Transforming and validating documents...');
                    return [4 /*yield*/, (0, migration_1.processMigration)(docs, transformer, {
                            validateData: true,
                            collectionName: sourceColl
                        })];
                case 7:
                    migrationResults = _a.sent();
                    // Check if Firestore is ready
                    console.log('Checking Firestore status...');
                    return [4 /*yield*/, firestoreTools.isFirestoreReady()];
                case 8:
                    firestoreReady = _a.sent();
                    if (!firestoreReady) {
                        throw new Error('Firestore is not ready. Check your credentials and connection.');
                    }
                    // Load data to Firestore
                    console.log('Loading data to Firestore...');
                    destCollection = process.env.DEST_COLLECTION || sourceColl;
                    return [4 /*yield*/, firestoreTools.loadToFirestore(migrationResults.transformedDocuments, destCollection, {
                            useBatch: true,
                            batchSize: 500,
                            generateIds: false,
                            merge: true
                        })];
                case 9:
                    firestoreResults = _a.sent();
                    // Add Firestore results to migration results
                    migrationResults.firestoreResults = firestoreResults;
                    // Print results
                    printMigrationResults(migrationResults);
                    console.log('\nMigration completed successfully!');
                    return [2 /*return*/, true];
                case 10:
                    error_4 = _a.sent();
                    console.error('Migration failed:', error_4.message);
                    if (error_4.details) {
                        console.error('Error details:', JSON.stringify(error_4.details, null, 2));
                    }
                    return [2 /*return*/, false];
                case 11:
                    if (!client) return [3 /*break*/, 13];
                    console.log('Closing MongoDB connection...');
                    return [4 /*yield*/, client.close()];
                case 12:
                    _a.sent();
                    _a.label = 13;
                case 13: return [7 /*endfinally*/];
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * Print migration results
 */
function printMigrationResults(results) {
    if (!results) {
        console.log('No migration results to display');
        return;
    }
    console.log('\nMigration Results:');
    console.log("- Documents Processed: ".concat(results.total || 0));
    console.log("- Successfully Transformed: ".concat(results.transformed || 0));
    console.log("- Failed Transformations: ".concat(results.failed || 0));
    if (results.validationResults) {
        console.log("- Valid Documents: ".concat(results.validationResults.valid.length));
        console.log("- Invalid Documents: ".concat(results.validationResults.invalid.length));
        if (results.validationResults.invalid.length > 0) {
            console.log('\nValidation Errors (sample):');
            var sampleErrors = results.validationResults.errors.slice(0, 3);
            for (var _i = 0, sampleErrors_1 = sampleErrors; _i < sampleErrors_1.length; _i++) {
                var error = sampleErrors_1[_i];
                console.log("- Document ".concat(error.document, ": ").concat(error.error));
            }
            if (results.validationResults.errors.length > 3) {
                console.log("... and ".concat(results.validationResults.errors.length - 3, " more errors"));
            }
        }
    }
    if (results.firestoreResults) {
        console.log('\nFirestore Load Results:');
        console.log("- Successfully Loaded: ".concat(results.firestoreResults.success));
        console.log("- Failed to Load: ".concat(results.firestoreResults.failed));
        if (results.firestoreResults.failed > 0) {
            console.log('\nFirestore Load Errors (sample):');
            var errors = results.firestoreResults.errors;
            var errorKeys = Object.keys(errors).slice(0, 3);
            for (var _a = 0, errorKeys_1 = errorKeys; _a < errorKeys_1.length; _a++) {
                var key = errorKeys_1[_a];
                console.log("- Document ".concat(key, ": ").concat(errors[key]));
            }
            if (Object.keys(errors).length > 3) {
                console.log("... and ".concat(Object.keys(errors).length - 3, " more errors"));
            }
        }
    }
}
/**
 * Main entry point
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('=== MongoDB to Firestore Migration Example ===');
                    if (!process.env.MONGODB_URI) {
                        console.error('MONGODB_URI environment variable is required');
                        process.exit(1);
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // Run migration
                    return [4 /*yield*/, runMigration()];
                case 2:
                    // Run migration
                    _a.sent();
                    console.log('\n=== Migration Example Completed ===');
                    return [3 /*break*/, 4];
                case 3:
                    error_5 = _a.sent();
                    console.error('Migration example failed:', error_5.message || error_5);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Run the script
main().catch(console.error);

"use strict";
/**
 * MongoDB to Firestore Migration Utilities
 *
 * Utilities for migrating data from MongoDB to Firestore.
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.handleFirestoreError = exports.initializeFirestore = exports.loadToFirestore = exports.getTransformer = exports.getValidationSchema = exports.validateMigrationData = void 0;
exports.initMongoDB = initMongoDB;
exports.closeMongoDB = closeMongoDB;
exports.listMongoCollections = listMongoCollections;
exports.getCollectionStats = getCollectionStats;
exports.extractData = extractData;
exports.migrateCollection = migrateCollection;
exports.migrateCollections = migrateCollections;
// Standard Node.js imports
var mongodb_1 = require("mongodb");
// Import validation utilities
var validation_1 = require("./validation");
// Import transformers
var transformers_1 = require("./transformers");
// Import Firestore loader
var firestore_1 = require("./firestore");
// MongoDB connection instance
var mongoClient = null;
var mongoDb = null;
/**
 * Initialize MongoDB connection
 *
 * @param uri MongoDB connection URI
 * @param dbName Optional database name (if not included in URI)
 * @param options Optional MongoDB client options
 * @returns MongoDB database instance
 */
function initMongoDB(uri_1, dbName_1) {
    return __awaiter(this, arguments, void 0, function (uri, dbName, options) {
        var defaultOptions, error_1, db;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!mongoClient) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    defaultOptions = __assign({ connectTimeoutMS: 30000, socketTimeoutMS: 45000, serverSelectionTimeoutMS: 30000, retryWrites: true, retryReads: true }, options);
                    mongoClient = new mongodb_1.MongoClient(uri, defaultOptions);
                    return [4 /*yield*/, mongoClient.connect()];
                case 2:
                    _a.sent();
                    console.log('Connected to MongoDB');
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error('Failed to connect to MongoDB:', error_1.message || error_1);
                    throw error_1;
                case 4:
                    db = mongoClient.db(dbName);
                    mongoDb = db;
                    return [2 /*return*/, db];
            }
        });
    });
}
/**
 * Close MongoDB connection
 */
function closeMongoDB() {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!mongoClient) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, mongoClient.close()];
                case 2:
                    _a.sent();
                    mongoClient = null;
                    mongoDb = null;
                    console.log('MongoDB connection closed');
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error('Error closing MongoDB connection:', error_2.message || error_2);
                    // Still set the client to null even if there's an error
                    mongoClient = null;
                    mongoDb = null;
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get a list of all collections in the MongoDB database
 *
 * @param db MongoDB database instance
 * @returns Array of collection names
 */
function listMongoCollections(db) {
    return __awaiter(this, void 0, void 0, function () {
        var database, collections, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    database = db || mongoDb;
                    if (!database) {
                        throw new Error('MongoDB not initialized. Call initMongoDB first.');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, database.listCollections().toArray()];
                case 2:
                    collections = _a.sent();
                    return [2 /*return*/, collections.map(function (c) { return c.name; })];
                case 3:
                    error_3 = _a.sent();
                    console.error('Failed to list collections:', error_3.message || error_3);
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get collection statistics
 *
 * @param collectionName Name of the collection
 * @param db MongoDB database instance
 * @returns Collection statistics
 */
function getCollectionStats(collectionName, db) {
    return __awaiter(this, void 0, void 0, function () {
        var database, collection, count, stats, avgDocSize, totalSize, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    database = db || mongoDb;
                    if (!database) {
                        throw new Error('MongoDB not initialized. Call initMongoDB first.');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    collection = database.collection(collectionName);
                    return [4 /*yield*/, collection.countDocuments()];
                case 2:
                    count = _a.sent();
                    return [4 /*yield*/, database.command({ collStats: collectionName })];
                case 3:
                    stats = _a.sent();
                    avgDocSize = count > 0 ? stats.avgObjSize || 0 : 0;
                    totalSize = stats.size || 0;
                    return [2 /*return*/, { count: count, avgDocSize: avgDocSize, totalSize: totalSize }];
                case 4:
                    error_4 = _a.sent();
                    console.error("Failed to get stats for ".concat(collectionName, ":"), error_4.message || error_4);
                    throw error_4;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Extract documents from a MongoDB collection
 *
 * @param collectionName Name of the collection
 * @param options Extraction options
 * @param db MongoDB database instance
 * @returns Array of documents
 */
function extractData(collectionName_1) {
    return __awaiter(this, arguments, void 0, function (collectionName, options, db) {
        var database, _a, query, _b, sort, limit, skip, collection, cursor, error_5;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    database = db || mongoDb;
                    if (!database) {
                        throw new Error('MongoDB not initialized. Call initMongoDB first.');
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    _a = options.query, query = _a === void 0 ? {} : _a, _b = options.sort, sort = _b === void 0 ? { _id: 1 } : _b, limit = options.limit, skip = options.skip;
                    collection = database.collection(collectionName);
                    cursor = collection.find(query).sort(sort);
                    if (skip) {
                        cursor = cursor.skip(skip);
                    }
                    if (limit) {
                        cursor = cursor.limit(limit);
                    }
                    return [4 /*yield*/, cursor.toArray()];
                case 2: return [2 /*return*/, _c.sent()];
                case 3:
                    error_5 = _c.sent();
                    console.error("Failed to extract data from ".concat(collectionName, ":"), error_5.message || error_5);
                    throw error_5;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Run complete migration process for a collection
 *
 * @param collectionName MongoDB collection name to migrate
 * @param options Migration options
 * @returns Migration statistics
 */
function migrateCollection(collectionName_1) {
    return __awaiter(this, arguments, void 0, function (collectionName, options) {
        var sourceDb, _a, query, _b, sort, _c, batchSize, _d, validate, validationSchema, _e, dryRun, _f, targetCollection, _g, deleteSource, stats, isReady, db, collection, totalCount, schema, transformer_1, validationReport_1, processed, _loop_1, state_1, error_6;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    sourceDb = options.sourceDb, _a = options.query, query = _a === void 0 ? {} : _a, _b = options.sort, sort = _b === void 0 ? { _id: 1 } : _b, _c = options.batchSize, batchSize = _c === void 0 ? 100 : _c, _d = options.validate, validate = _d === void 0 ? true : _d, validationSchema = options.validationSchema, _e = options.dryRun, dryRun = _e === void 0 ? false : _e, _f = options.targetCollection, targetCollection = _f === void 0 ? collectionName : _f, _g = options.deleteSource, deleteSource = _g === void 0 ? false : _g;
                    stats = {
                        collection: collectionName,
                        startTime: new Date(),
                        endTime: null,
                        documentsProcessed: 0,
                        documentsSucceeded: 0,
                        documentsFailed: 0,
                        validationReport: null,
                        errors: []
                    };
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 8, 9, 10]);
                    // Check MongoDB connection
                    if (!mongoDb) {
                        throw new Error('MongoDB not initialized. Call initMongoDB first.');
                    }
                    if (!!dryRun) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, firestore_1.isFirestoreReady)()];
                case 2:
                    isReady = _h.sent();
                    if (!isReady) {
                        throw new Error('Firestore is not ready. Call initializeFirestore first.');
                    }
                    _h.label = 3;
                case 3:
                    db = sourceDb && mongoClient ? mongoClient.db(sourceDb) : mongoDb;
                    if (!db) {
                        throw new Error('Failed to get database reference');
                    }
                    collection = db.collection(collectionName);
                    return [4 /*yield*/, collection.countDocuments(query)];
                case 4:
                    totalCount = _h.sent();
                    console.log("Found ".concat(totalCount, " documents in ").concat(collectionName, " to migrate"));
                    schema = validationSchema;
                    if (validate && !schema) {
                        schema = (0, validation_1.getValidationSchema)(collectionName);
                    }
                    transformer_1 = (0, transformers_1.getTransformer)(collectionName);
                    validationReport_1 = {
                        totalDocuments: 0,
                        validDocuments: 0,
                        invalidDocuments: 0,
                        validationErrors: []
                    };
                    processed = 0;
                    _loop_1 = function () {
                        var documents, transformedDocs_1, validationResult_1, validDocs, loadResult, error_7, docIds, error_8, batchError_1;
                        return __generator(this, function (_j) {
                            switch (_j.label) {
                                case 0: return [4 /*yield*/, extractData(collectionName, {
                                        query: query,
                                        sort: sort,
                                        limit: batchSize,
                                        skip: processed
                                    }, db)];
                                case 1:
                                    documents = _j.sent();
                                    if (documents.length === 0)
                                        return [2 /*return*/, "break"];
                                    // Update processed count
                                    processed += documents.length;
                                    stats.documentsProcessed += documents.length;
                                    console.log("Processing batch: ".concat(processed, " / ").concat(totalCount));
                                    _j.label = 2;
                                case 2:
                                    _j.trys.push([2, 15, , 16]);
                                    transformedDocs_1 = documents.map(function (doc) {
                                        var _a;
                                        try {
                                            return transformer_1(doc);
                                        }
                                        catch (error) {
                                            stats.documentsFailed++;
                                            stats.errors.push({
                                                document: ((_a = doc._id) === null || _a === void 0 ? void 0 : _a.toString()) || 'unknown',
                                                error: error.message || 'Transform error',
                                                phase: 'transform'
                                            });
                                            return null;
                                        }
                                    }).filter(function (doc) { return doc !== null; });
                                    if (!(validate && schema)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, (0, validation_1.validateMigrationData)(transformedDocs_1, schema)];
                                case 3:
                                    validationResult_1 = _j.sent();
                                    // Update validation report
                                    validationReport_1.totalDocuments += transformedDocs_1.length;
                                    validationReport_1.validDocuments += validationResult_1.validIndexes.length;
                                    validationReport_1.invalidDocuments += validationResult_1.invalidIndexes.length;
                                    // Add validation errors to the report
                                    validationResult_1.invalidIndexes.forEach(function (index) {
                                        var _a;
                                        var docId = ((_a = documents[index]._id) === null || _a === void 0 ? void 0 : _a.toString()) || "doc-".concat(index);
                                        validationReport_1.validationErrors.push({
                                            document: docId,
                                            error: validationResult_1.errors[index],
                                            phase: 'validate'
                                        });
                                    });
                                    // If some documents are invalid, filter them out
                                    if (!validationResult_1.allValid) {
                                        console.warn("".concat(validationResult_1.invalidIndexes.length, " documents failed validation"));
                                        validDocs = validationResult_1.validIndexes.map(function (index) { return transformedDocs_1[index]; });
                                        transformedDocs_1.length = 0;
                                        transformedDocs_1.push.apply(transformedDocs_1, validDocs);
                                    }
                                    _j.label = 4;
                                case 4:
                                    if (!(!dryRun && transformedDocs_1.length > 0)) return [3 /*break*/, 9];
                                    _j.label = 5;
                                case 5:
                                    _j.trys.push([5, 7, , 8]);
                                    return [4 /*yield*/, (0, firestore_1.loadToFirestore)(transformedDocs_1, targetCollection, {
                                            useBatch: true,
                                            batchSize: 500,
                                            generateIds: true,
                                            merge: false
                                        })];
                                case 6:
                                    loadResult = _j.sent();
                                    stats.documentsSucceeded += loadResult.success;
                                    stats.documentsFailed += loadResult.failed;
                                    // Add any load errors to stats
                                    Object.entries(loadResult.errors).forEach(function (_a) {
                                        var docId = _a[0], errorMsg = _a[1];
                                        stats.errors.push({
                                            document: docId,
                                            error: errorMsg,
                                            phase: 'load'
                                        });
                                    });
                                    return [3 /*break*/, 8];
                                case 7:
                                    error_7 = _j.sent();
                                    console.error("Error loading batch to Firestore:", error_7.message || error_7);
                                    stats.documentsFailed += transformedDocs_1.length;
                                    stats.errors.push({
                                        error: error_7.message || 'Unknown error during Firestore load',
                                        phase: 'load'
                                    });
                                    return [3 /*break*/, 8];
                                case 8: return [3 /*break*/, 10];
                                case 9:
                                    if (dryRun) {
                                        // In dry run, we consider all documents as succeeded
                                        stats.documentsSucceeded += transformedDocs_1.length;
                                    }
                                    _j.label = 10;
                                case 10:
                                    if (!(deleteSource && !dryRun)) return [3 /*break*/, 14];
                                    docIds = documents.map(function (doc) { return doc._id; });
                                    _j.label = 11;
                                case 11:
                                    _j.trys.push([11, 13, , 14]);
                                    return [4 /*yield*/, collection.deleteMany({ _id: { $in: docIds } })];
                                case 12:
                                    _j.sent();
                                    return [3 /*break*/, 14];
                                case 13:
                                    error_8 = _j.sent();
                                    console.error("Error deleting source documents:", error_8.message || error_8);
                                    stats.errors.push({
                                        error: error_8.message || 'Unknown error deleting source documents',
                                        phase: 'process'
                                    });
                                    return [3 /*break*/, 14];
                                case 14: return [3 /*break*/, 16];
                                case 15:
                                    batchError_1 = _j.sent();
                                    console.error("Error processing batch:", batchError_1.message || batchError_1);
                                    stats.documentsFailed += documents.length;
                                    stats.errors.push({
                                        error: batchError_1.message || 'Unknown batch processing error',
                                        phase: 'process'
                                    });
                                    return [3 /*break*/, 16];
                                case 16: return [2 /*return*/];
                            }
                        });
                    };
                    _h.label = 5;
                case 5:
                    if (!(processed < totalCount)) return [3 /*break*/, 7];
                    return [5 /*yield**/, _loop_1()];
                case 6:
                    state_1 = _h.sent();
                    if (state_1 === "break")
                        return [3 /*break*/, 7];
                    return [3 /*break*/, 5];
                case 7:
                    // Set validation report in stats
                    if (validate) {
                        stats.validationReport = validationReport_1;
                    }
                    return [3 /*break*/, 10];
                case 8:
                    error_6 = _h.sent();
                    console.error("Migration error for ".concat(collectionName, ":"), error_6.message || error_6);
                    stats.errors.push({
                        error: error_6.message || 'Unknown migration error',
                        phase: 'process'
                    });
                    return [3 /*break*/, 10];
                case 9:
                    // Finalize stats
                    stats.endTime = new Date();
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/, stats];
            }
        });
    });
}
/**
 * Run a complete migration for multiple collections
 *
 * @param collections Array of collection names to migrate
 * @param options Migration options
 * @returns Map of collection names to migration stats
 */
function migrateCollections(collections_1) {
    return __awaiter(this, arguments, void 0, function (collections, options) {
        var results, _i, collections_2, collectionName, stats, error_9;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    results = new Map();
                    _i = 0, collections_2 = collections;
                    _a.label = 1;
                case 1:
                    if (!(_i < collections_2.length)) return [3 /*break*/, 6];
                    collectionName = collections_2[_i];
                    console.log("Migrating collection: ".concat(collectionName));
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, migrateCollection(collectionName, options)];
                case 3:
                    stats = _a.sent();
                    results.set(collectionName, stats);
                    return [3 /*break*/, 5];
                case 4:
                    error_9 = _a.sent();
                    console.error("Failed to migrate ".concat(collectionName, ":"), error_9.message || error_9);
                    // Add failed stats
                    results.set(collectionName, {
                        collection: collectionName,
                        startTime: new Date(),
                        endTime: new Date(),
                        documentsProcessed: 0,
                        documentsSucceeded: 0,
                        documentsFailed: 0,
                        validationReport: null,
                        errors: [{
                                error: error_9.message || 'Unknown error',
                                phase: 'process'
                            }]
                    });
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, results];
            }
        });
    });
}
// Export all types and utilities
__exportStar(require("./types"), exports);
var validation_2 = require("./validation");
Object.defineProperty(exports, "validateMigrationData", { enumerable: true, get: function () { return validation_2.validateMigrationData; } });
Object.defineProperty(exports, "getValidationSchema", { enumerable: true, get: function () { return validation_2.getValidationSchema; } });
var transformers_2 = require("./transformers");
Object.defineProperty(exports, "getTransformer", { enumerable: true, get: function () { return transformers_2.getTransformer; } });
var firestore_2 = require("./firestore");
Object.defineProperty(exports, "loadToFirestore", { enumerable: true, get: function () { return firestore_2.loadToFirestore; } });
Object.defineProperty(exports, "initializeFirestore", { enumerable: true, get: function () { return firestore_2.initializeFirestore; } });
Object.defineProperty(exports, "handleFirestoreError", { enumerable: true, get: function () { return firestore_2.handleFirestoreError; } });

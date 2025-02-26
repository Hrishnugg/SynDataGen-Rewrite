"use strict";
/**
 * Firestore Migration Loader
 *
 * Utilities for loading transformed data into Firestore.
 */
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
exports.loadToFirestore = loadToFirestore;
exports.initializeFirestore = initializeFirestore;
exports.isFirestoreReady = isFirestoreReady;
exports.handleFirestoreError = handleFirestoreError;
var admin = __importStar(require("firebase-admin"));
// Track initialization status
var isInitialized = false;
/**
 * Load documents into Firestore
 *
 * @param documents Documents to load
 * @param collectionPath Target Firestore collection path
 * @param options Loading options
 * @returns Loading result
 */
function loadToFirestore(documents_1, collectionPath_1) {
    return __awaiter(this, arguments, void 0, function (documents, collectionPath, options) {
        var initialized, _a, useBatch, _b, batchSize, _c, generateIds, _d, errorHandling, _e, merge, result, db, collection, _loop_1, i, _i, documents_2, doc, docRef, err_1, docId, err_2;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (!!isInitialized) return [3 /*break*/, 2];
                    return [4 /*yield*/, initializeFirestore()];
                case 1:
                    initialized = _f.sent();
                    if (!initialized) {
                        throw new Error('Firestore initialization failed');
                    }
                    _f.label = 2;
                case 2:
                    _a = options.useBatch, useBatch = _a === void 0 ? true : _a, _b = options.batchSize, batchSize = _b === void 0 ? 500 : _b, _c = options.generateIds, generateIds = _c === void 0 ? false : _c, _d = options.errorHandling, errorHandling = _d === void 0 ? 'continue' : _d, _e = options.merge, merge = _e === void 0 ? false : _e;
                    result = {
                        success: 0,
                        failed: 0,
                        successIds: [],
                        errors: {}
                    };
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 18, , 19]);
                    db = admin.firestore();
                    collection = db.collection(collectionPath);
                    if (!useBatch) return [3 /*break*/, 8];
                    _loop_1 = function (i) {
                        var batch, currentBatch, _g, currentBatch_1, doc, docRef, docId;
                        return __generator(this, function (_h) {
                            switch (_h.label) {
                                case 0:
                                    batch = db.batch();
                                    currentBatch = documents.slice(i, i + batchSize);
                                    for (_g = 0, currentBatch_1 = currentBatch; _g < currentBatch_1.length; _g++) {
                                        doc = currentBatch_1[_g];
                                        try {
                                            docRef = void 0;
                                            if (generateIds) {
                                                docRef = collection.doc();
                                            }
                                            else if (doc.id) {
                                                docRef = collection.doc(doc.id);
                                            }
                                            else {
                                                throw new Error('Document has no ID and generateIds is false');
                                            }
                                            if (merge) {
                                                batch.set(docRef, doc, { merge: true });
                                            }
                                            else {
                                                batch.set(docRef, doc);
                                            }
                                            result.successIds.push(docRef.id);
                                        }
                                        catch (err) {
                                            docId = doc.id || 'unknown';
                                            result.errors[docId] = err.message || 'Unknown error';
                                            result.failed++;
                                            if (errorHandling === 'abort') {
                                                throw err;
                                            }
                                        }
                                    }
                                    return [4 /*yield*/, batch.commit()];
                                case 1:
                                    _h.sent();
                                    result.success += currentBatch.length - Object.keys(result.errors).filter(function (id) {
                                        return currentBatch.some(function (doc) { return doc.id === id; });
                                    }).length;
                                    return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _f.label = 4;
                case 4:
                    if (!(i < documents.length)) return [3 /*break*/, 7];
                    return [5 /*yield**/, _loop_1(i)];
                case 5:
                    _f.sent();
                    _f.label = 6;
                case 6:
                    i += batchSize;
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 17];
                case 8:
                    _i = 0, documents_2 = documents;
                    _f.label = 9;
                case 9:
                    if (!(_i < documents_2.length)) return [3 /*break*/, 17];
                    doc = documents_2[_i];
                    _f.label = 10;
                case 10:
                    _f.trys.push([10, 15, , 16]);
                    docRef = void 0;
                    if (generateIds) {
                        docRef = collection.doc();
                    }
                    else if (doc.id) {
                        docRef = collection.doc(doc.id);
                    }
                    else {
                        throw new Error('Document has no ID and generateIds is false');
                    }
                    if (!merge) return [3 /*break*/, 12];
                    return [4 /*yield*/, docRef.set(doc, { merge: true })];
                case 11:
                    _f.sent();
                    return [3 /*break*/, 14];
                case 12: return [4 /*yield*/, docRef.set(doc)];
                case 13:
                    _f.sent();
                    _f.label = 14;
                case 14:
                    result.successIds.push(docRef.id);
                    result.success++;
                    return [3 /*break*/, 16];
                case 15:
                    err_1 = _f.sent();
                    docId = doc.id || 'unknown';
                    result.errors[docId] = err_1.message || 'Unknown error';
                    result.failed++;
                    if (errorHandling === 'abort') {
                        throw err_1;
                    }
                    return [3 /*break*/, 16];
                case 16:
                    _i++;
                    return [3 /*break*/, 9];
                case 17: return [2 /*return*/, result];
                case 18:
                    err_2 = _f.sent();
                    return [2 /*return*/, handleFirestoreError(err_2, {
                            collection: collectionPath,
                            operation: 'loadToFirestore'
                        })];
                case 19: return [2 /*return*/];
            }
        });
    });
}
/**
 * Initialize Firestore connection
 *
 * @returns Promise resolving to true if initialization successful, false otherwise
 */
function initializeFirestore() {
    return __awaiter(this, void 0, void 0, function () {
        var err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    if (isInitialized) {
                        return [2 /*return*/, true];
                    }
                    if (admin.apps.length === 0) {
                        admin.initializeApp({
                            credential: admin.credential.applicationDefault()
                        });
                    }
                    // Test connection by making a simple query
                    return [4 /*yield*/, admin.firestore().collection('_test_connection').limit(1).get()];
                case 1:
                    // Test connection by making a simple query
                    _a.sent();
                    isInitialized = true;
                    console.log('Firestore connection initialized successfully');
                    return [2 /*return*/, true];
                case 2:
                    err_3 = _a.sent();
                    console.error('Firestore initialization failed:', err_3.message || err_3);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if Firestore is ready to accept writes
 *
 * @returns Promise resolving to true if Firestore is ready
 */
function isFirestoreReady() {
    return __awaiter(this, void 0, void 0, function () {
        var err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!!isInitialized) return [3 /*break*/, 2];
                    return [4 /*yield*/, initializeFirestore()];
                case 1: return [2 /*return*/, _a.sent()];
                case 2: return [2 /*return*/, true];
                case 3:
                    err_4 = _a.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Handle errors during Firestore operations
 *
 * @param error Error object
 * @param context Additional context information
 * @returns Formatted migration error
 */
function handleFirestoreError(error, context) {
    var errorMessage = error.message || 'Unknown Firestore error';
    var errorCode = error.code || 'unknown';
    var migrationError = {
        message: "Firestore ".concat(context.operation, " error: ").concat(errorMessage),
        code: "firestore_".concat(errorCode),
        details: {
            collection: context.collection,
            document: context.document,
            originalError: error
        }
    };
    throw migrationError;
}

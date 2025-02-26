"use strict";
/**
 * Migration Validation Utilities
 *
 * Tools for validating data during the migration process.
 */
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
exports.validateDocument = validateDocument;
exports.validateMigrationData = validateMigrationData;
exports.getValidationSchema = getValidationSchema;
/**
 * Validate a single document against a schema
 *
 * @param document The document to validate
 * @param schema Validation schema
 * @returns String error message if invalid, null if valid
 */
function validateDocument(document, schema) {
    if (!document || typeof document !== 'object') {
        return 'Document must be an object';
    }
    // Check each field in the schema
    for (var _i = 0, _a = Object.entries(schema); _i < _a.length; _i++) {
        var _b = _a[_i], field = _b[0], rules = _b[1];
        var value = document[field];
        // Check required fields
        if (rules.required && (value === undefined || value === null)) {
            return "Field '".concat(field, "' is required");
        }
        // Skip validation for undefined optional fields
        if (value === undefined) {
            continue;
        }
        // Type validation
        if (rules.type !== 'any' && value !== null) {
            var typeValid = false;
            switch (rules.type) {
                case 'string':
                    typeValid = typeof value === 'string';
                    break;
                case 'number':
                    typeValid = typeof value === 'number';
                    break;
                case 'boolean':
                    typeValid = typeof value === 'boolean';
                    break;
                case 'object':
                    typeValid = typeof value === 'object' && !Array.isArray(value);
                    break;
                case 'array':
                    typeValid = Array.isArray(value);
                    break;
                case 'date':
                    typeValid = value instanceof Date ||
                        (typeof value === 'string' && !isNaN(Date.parse(value))) ||
                        (typeof value === 'object' && value.seconds !== undefined);
                    break;
            }
            if (!typeValid) {
                return "Field '".concat(field, "' must be of type ").concat(rules.type);
            }
        }
        // Skip further validation if value is null
        if (value === null) {
            continue;
        }
        // String-specific validations
        if (rules.type === 'string' && typeof value === 'string') {
            if (rules.min !== undefined && value.length < rules.min) {
                return "Field '".concat(field, "' must be at least ").concat(rules.min, " characters long");
            }
            if (rules.max !== undefined && value.length > rules.max) {
                return "Field '".concat(field, "' must be at most ").concat(rules.max, " characters long");
            }
            if (rules.pattern && !rules.pattern.test(value)) {
                return "Field '".concat(field, "' must match pattern ").concat(rules.pattern);
            }
        }
        // Number-specific validations
        if (rules.type === 'number' && typeof value === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                return "Field '".concat(field, "' must be at least ").concat(rules.min);
            }
            if (rules.max !== undefined && value > rules.max) {
                return "Field '".concat(field, "' must be at most ").concat(rules.max);
            }
        }
        // Array-specific validations
        if (rules.type === 'array' && Array.isArray(value)) {
            if (rules.min !== undefined && value.length < rules.min) {
                return "Field '".concat(field, "' must have at least ").concat(rules.min, " items");
            }
            if (rules.max !== undefined && value.length > rules.max) {
                return "Field '".concat(field, "' must have at most ").concat(rules.max, " items");
            }
        }
        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
            return "Field '".concat(field, "' must be one of: ").concat(rules.enum.join(', '));
        }
        // Nested object validation
        if (rules.type === 'object' && rules.nested && typeof value === 'object') {
            var nestedValidation = validateDocument(value, rules.nested);
            if (nestedValidation) {
                return "".concat(field, ".").concat(nestedValidation);
            }
        }
        // Custom validator
        if (rules.validator) {
            var validatorResult = rules.validator(value);
            if (validatorResult !== true) {
                return typeof validatorResult === 'string'
                    ? "Field '".concat(field, "': ").concat(validatorResult)
                    : "Field '".concat(field, "' failed custom validation");
            }
        }
    }
    return null;
}
/**
 * Validate a batch of documents against a schema
 *
 * @param documents Array of documents to validate
 * @param schema Validation schema
 * @returns Validation results with valid and invalid indexes
 */
function validateMigrationData(documents, schema) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            result = {
                validIndexes: [],
                invalidIndexes: [],
                errors: {},
                allValid: true
            };
            // If no schema provided, consider all documents valid
            if (!schema) {
                result.validIndexes = documents.map(function (_, index) { return index; });
                return [2 /*return*/, result];
            }
            // Validate each document
            documents.forEach(function (doc, index) {
                var validationError = validateDocument(doc, schema);
                if (validationError) {
                    result.invalidIndexes.push(index);
                    result.errors[index] = validationError;
                    result.allValid = false;
                }
                else {
                    result.validIndexes.push(index);
                }
            });
            return [2 /*return*/, result];
        });
    });
}
/**
 * Create a validation schema for a specific collection
 *
 * @param collectionName The collection to create a schema for
 * @returns Validation schema for the collection
 */
function getValidationSchema(collectionName) {
    switch (collectionName) {
        case 'users':
            return {
                name: { type: 'string', required: true },
                email: {
                    type: 'string',
                    required: true,
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                },
                // Password is hashed, so it should be a string
                password: { type: 'string', required: true },
                company: { type: 'string', required: true },
                createdAt: { type: 'date', required: true },
                updatedAt: { type: 'date', required: true }
            };
        case 'projects':
            return {
                name: { type: 'string', required: true },
                description: { type: 'string', required: true },
                ownerId: { type: 'string', required: true },
                teamMembers: {
                    type: 'array',
                    required: true,
                    // We can add nested validation for each team member
                    validator: function (members) {
                        if (!Array.isArray(members))
                            return 'Must be an array';
                        for (var i = 0; i < members.length; i++) {
                            var member = members[i];
                            if (!member.userId || typeof member.userId !== 'string') {
                                return "Team member at index ".concat(i, " must have a valid userId");
                            }
                            if (!['owner', 'admin', 'member', 'viewer'].includes(member.role)) {
                                return "Team member at index ".concat(i, " has invalid role");
                            }
                        }
                        return true;
                    }
                },
                createdAt: { type: 'date', required: true },
                updatedAt: { type: 'date', required: true },
                status: {
                    type: 'string',
                    required: true,
                    enum: ['active', 'archived']
                },
                storageConfig: {
                    type: 'object',
                    required: true,
                    nested: {
                        bucketName: { type: 'string', required: true },
                        region: { type: 'string', required: true }
                    }
                },
                settings: {
                    type: 'object',
                    required: true,
                    nested: {
                        dataRetentionDays: { type: 'number', required: true },
                        maxStorageGB: { type: 'number', required: true }
                    }
                },
                metadata: { type: 'object', required: true }
            };
        case 'waitlist':
            return {
                email: {
                    type: 'string',
                    required: true,
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                },
                name: { type: 'string', required: true },
                company: { type: 'string', required: true },
                industry: { type: 'string', required: true },
                dataVolume: { type: 'string', required: true },
                useCase: { type: 'string', required: true },
                createdAt: { type: 'date', required: true },
                status: { type: 'string', required: true },
                ipAddress: { type: 'string', required: false }
            };
        default:
            // Return a minimal schema that just ensures documents are objects
            return { _id: { type: 'any', required: false } };
    }
}

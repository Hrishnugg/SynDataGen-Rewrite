"use strict";
/**
 * Migration Transformers
 *
 * Functions to transform MongoDB documents to Firestore-compatible format.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseTransformer = baseTransformer;
exports.getTransformer = getTransformer;
/**
 * Basic transformer that handles common MongoDB to Firestore transformations
 *
 * @param document MongoDB document
 * @param options Transform options
 * @returns Transformed document suitable for Firestore
 */
function baseTransformer(document, options) {
    if (options === void 0) { options = {}; }
    var _a = options.includeId, includeId = _a === void 0 ? false : _a, _b = options.stringifyIds, stringifyIds = _b === void 0 ? true : _b, _c = options.fieldMappings, fieldMappings = _c === void 0 ? {} : _c, _d = options.excludeFields, excludeFields = _d === void 0 ? ['__v'] : _d, _e = options.defaultValues, defaultValues = _e === void 0 ? {} : _e;
    // Create a copy to avoid modifying the original
    var result = {};
    // Process MongoDB ID
    if (includeId && document._id) {
        result.id = stringifyIds ? document._id.toString() : document._id;
    }
    // Add all other fields with potential transformations
    for (var _i = 0, _f = Object.entries(document); _i < _f.length; _i++) {
        var _g = _f[_i], key = _g[0], value = _g[1];
        // Skip _id as it's already handled and any excluded fields
        if (key === '_id' || excludeFields.includes(key)) {
            continue;
        }
        // Map field name if specified in fieldMappings
        var targetKey = fieldMappings[key] || key;
        // Transform the value
        result[targetKey] = transformValue(value, stringifyIds);
    }
    // Add default values for missing fields
    for (var _h = 0, _j = Object.entries(defaultValues); _h < _j.length; _h++) {
        var _k = _j[_h], key = _k[0], value = _k[1];
        if (result[key] === undefined) {
            result[key] = value;
        }
    }
    return result;
}
/**
 * Transform a specific value type from MongoDB to Firestore compatible format
 *
 * @param value The value to transform
 * @param stringifyIds Whether to convert ObjectIds to strings
 * @returns Transformed value
 */
function transformValue(value, stringifyIds) {
    // Handle null or undefined
    if (value === null || value === undefined) {
        return value;
    }
    // Handle Date objects - Firestore accepts Date objects directly
    if (value instanceof Date) {
        return value;
    }
    // Handle MongoDB ObjectId
    if (value && typeof value === 'object' && value.constructor.name === 'ObjectId') {
        return stringifyIds ? value.toString() : value;
    }
    // Handle arrays recursively
    if (Array.isArray(value)) {
        return value.map(function (item) { return transformValue(item, stringifyIds); });
    }
    // Handle nested objects recursively
    if (typeof value === 'object') {
        var transformedObj = {};
        for (var _i = 0, _a = Object.entries(value); _i < _a.length; _i++) {
            var _b = _a[_i], k = _b[0], v = _b[1];
            transformedObj[k] = transformValue(v, stringifyIds);
        }
        return transformedObj;
    }
    // Primitive values can be returned as is
    return value;
}
/**
 * Gets a transformer function for a specific collection
 *
 * @param collectionName Name of the collection to get transformer for
 * @returns Transform function for the collection
 */
function getTransformer(collectionName) {
    // Each collection can have specific transformation logic
    switch (collectionName) {
        case 'users':
            return function (doc) {
                // Start with base transformation
                var transformed = baseTransformer(doc, {
                    includeId: false, // We'll use Firestore's auto ID
                    stringifyIds: true,
                    // Map fields that need renaming
                    fieldMappings: {
                        // Example: accountStatus -> status
                        accountStatus: 'status'
                    },
                    // Add default values
                    defaultValues: {
                        status: 'active',
                        preference: {
                            emailNotifications: true,
                            theme: 'light'
                        }
                    }
                });
                // Add any custom transformations for users
                transformed.createdAt = doc.createdAt || new Date();
                transformed.updatedAt = doc.updatedAt || new Date();
                // If we're using Firebase Authentication, we might need to adjust fields
                if (transformed.firebaseUid) {
                    transformed.authProvider = 'firebase';
                }
                return transformed;
            };
        case 'projects':
            return function (doc) {
                var transformed = baseTransformer(doc, {
                    includeId: false,
                    stringifyIds: true,
                    // Transform team members to have string IDs
                    defaultValues: {
                        status: 'active',
                        settings: {
                            dataRetentionDays: 30,
                            maxStorageGB: 10
                        }
                    }
                });
                // Ensure dates are proper Firestore timestamps
                transformed.createdAt = doc.createdAt || new Date();
                transformed.updatedAt = doc.updatedAt || new Date();
                // Transform team members array to ensure IDs are strings
                if (Array.isArray(transformed.teamMembers)) {
                    transformed.teamMembers = transformed.teamMembers.map(function (member) { return (__assign(__assign({}, member), { userId: member.userId.toString(), addedAt: member.addedAt || new Date() })); });
                }
                return transformed;
            };
        case 'dataJobs':
            return function (doc) {
                var transformed = baseTransformer(doc, {
                    includeId: false,
                    stringifyIds: true,
                    fieldMappings: {
                        // Rename fields if needed
                        jobId: 'id',
                        creationTime: 'createdAt'
                    }
                });
                // Ensure all job references use string IDs
                if (transformed.projectId) {
                    transformed.projectId = transformed.projectId.toString();
                }
                if (transformed.createdBy) {
                    transformed.createdBy = transformed.createdBy.toString();
                }
                // Convert status to Firestore-friendly format
                transformed.status = transformed.status || 'queued';
                // Add timestamps if missing
                transformed.createdAt = doc.createdAt || doc.creationTime || new Date();
                transformed.updatedAt = doc.updatedAt || new Date();
                return transformed;
            };
        case 'waitlist':
            return function (doc) {
                return baseTransformer(doc, {
                    includeId: false,
                    // Simple transformation with no special logic
                    defaultValues: {
                        status: 'pending'
                    }
                });
            };
        default:
            // Default to basic transformer for unknown collections
            return function (doc) { return baseTransformer(doc); };
    }
}

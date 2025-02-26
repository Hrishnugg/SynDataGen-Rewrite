# Firestore Optimization Guidelines

After completing the migration from MongoDB to Firestore, these guidelines will help optimize our Firestore usage for better performance, cost efficiency, and maintainability.

## Query Optimization

### 1. Index Management

- **Review Existing Indexes**
  ```bash
  firebase firestore:indexes
  ```

- **Create Composite Indexes** for frequently used queries with multiple filters/ordering:
  ```bash
  firebase firestore:indexes --import path/to/firestore-indexes.json
  ```

- **Remove Unused Indexes** to reduce maintenance overhead and potential costs.

### 2. Query Patterns

- **Avoid Collection Scans** - Always query with indexed fields
- **Use Cursor Pagination** instead of offset pagination:
  ```typescript
  const lastDoc = /* last document from previous page */;
  const nextPage = await firestore
    .collection('customers')
    .orderBy('createdAt')
    .startAfter(lastDoc)
    .limit(20)
    .get();
  ```

- **Limit Query Results** - Always use .limit() to control document count
- **Use Compound Queries** - Use where clauses with equality conditions before range conditions

## Caching Strategy

### 1. Enhanced Memory Cache

- **Implement Tiered Caching**:
  ```typescript
  // In-memory cache for frequently accessed data (already implemented)
  // Add Redis/Memcached for distributed caching (for multi-instance deployments)
  ```

- **Smart Cache Invalidation**:
  ```typescript
  // Invalidate specific patterns 
  cache.invalidatePattern('customers/*');
  ```

- **Preload Common Data** on application startup:
  ```typescript
  async function preloadCommonData() {
    const commonSettings = await firestore.collection('settings').get();
    cache.set('common_settings', convertQuerySnapshot(commonSettings));
  }
  ```

### 2. Cache Control

- **Variable TTL** based on data type:
  ```typescript
  // Frequently changing data: short TTL
  cache.set('active_users', data, { ttlSeconds: 30 });
  
  // Stable reference data: longer TTL
  cache.set('product_categories', data, { ttlSeconds: 3600 });
  ```

## Data Structure Optimization

### 1. Document Size

- **Keep Documents Small** - Aim for <100KB, never exceed 1MB
- **Use Subcollections** for related data instead of embedding large arrays:
  ```typescript
  // Instead of:
  // customers/{customerId} with large activities array
  
  // Use:
  // customers/{customerId}
  // customers/{customerId}/activities/{activityId}
  ```

### 2. Denormalization Strategy

- **Denormalize Carefully** - Duplicate data only when necessary for performance
- **Update Hooks** to keep denormalized data in sync:
  ```typescript
  // When updating a project
  async function updateProject(projectId, data) {
    const batch = firestore.batch();
    
    // Update the project document
    const projectRef = firestore.collection('projects').doc(projectId);
    batch.update(projectRef, data);
    
    // Update denormalized project data in other documents
    if (data.name) {
      const referencingDocs = await firestore
        .collection('dataGenerationJobs')
        .where('projectId', '==', projectId)
        .get();
        
      referencingDocs.forEach(doc => {
        batch.update(doc.ref, { projectName: data.name });
      });
    }
    
    await batch.commit();
  }
  ```

## Cost Optimization

### 1. Read/Write Patterns

- **Batch Operations** - Use batched writes for multiple documents:
  ```typescript
  const batch = firestore.batch();
  
  // Add up to 500 operations to the batch
  documents.forEach(doc => {
    batch.set(firestore.collection('collection').doc(doc.id), doc);
  });
  
  await batch.commit();
  ```

- **Minimize Reads** - Use real-time listeners carefully and detach when not needed
- **Use Transactions** only when atomicity is essential

### 2. Usage Monitoring

- **Set Up Billing Alerts** in GCP Console
- **Implement Usage Metrics** for operations:
  ```typescript
  // Track operations by type and collection
  function trackOperation(collection, operation, docsCount = 1) {
    // Record metrics
    metrics.increment(`firestore.${operation}.${collection}`, docsCount);
  }
  ```

## Security Rules

### 1. Optimizing Rules

- **Keep Rules Simple** - Complex rules increase latency
- **Use Rule Caching** for repeated access patterns:
  ```
  // Example of efficient rules
  service cloud.firestore {
    match /databases/{database}/documents {
      function isAuthenticated() {
        return request.auth != null;
      }
      
      function isCustomer(customerId) {
        return isAuthenticated() && 
               request.auth.uid == customerId;
      }
      
      match /customers/{customerId} {
        allow read: if isCustomer(customerId);
        allow write: if false; // Only through admin functions
      }
    }
  }
  ```

### 2. Rule Testing

- **Implement Rule Unit Tests**:
  ```bash
  npm install -D @firebase/rules-unit-testing
  ```

- **Automate Rule Deployment** with test verification:
  ```bash
  npm run test:firestore-rules && firebase deploy --only firestore:rules
  ```

## Deployment and CI/CD

### 1. Automated Index Management

- **Include Index Definitions** in source control
- **Automate Index Deployment** with CI/CD:
  ```yaml
  # In CI/CD pipeline
  - name: Deploy Firestore indexes
    run: firebase deploy --only firestore:indexes
  ```

### 2. Monitoring

- **Set Up Firestore Monitoring Dashboard** in GCP
- **Configure Alerts** for error rates, high latency and quotas

## Implementation Plan

1. **Week 1: Analyze current usage**
   - Review query patterns
   - Identify slow queries
   - Profile operation counts

2. **Week 2: Implement optimizations**
   - Optimize indexes
   - Enhance caching
   - Update query patterns

3. **Week 3: Set up monitoring**
   - Deploy dashboards
   - Configure alerts
   - Document best practices

## Resources

- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firestore Query Optimization](https://firebase.google.com/docs/firestore/query-data/get-data#best_practices)
- [Cloud Monitoring for Firestore](https://cloud.google.com/firestore/docs/monitoring/metric-types) 
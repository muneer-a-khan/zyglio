# Training Module Approval Troubleshooting Guide

## Issue: "Failed to process training module approval"

This error can occur when trying to publish/approve a training module through the SME interface.

## Root Causes and Fixes

### 1. **User Validation Issue** ✅ FIXED
**Problem**: The API was not validating if the SME user exists before trying to use their ID as a foreign key reference.

**Fix**: Added user existence validation:
```typescript
const smeUser = await prisma.user.findUnique({
  where: { id: smeId }
});

if (!smeUser) {
  return NextResponse.json(
    { error: 'SME user not found' },
    { status: 404 }
  );
}
```

### 2. **Permission Validation** ✅ FIXED
**Problem**: The code was allowing any SME to approve any module without proper permission checks.

**Fix**: Added proper permission validation:
```typescript
if (module.procedure.LearningTask?.userId !== smeId) {
  return NextResponse.json(
    { error: 'You do not have permission to approve this module' },
    { status: 403 }
  );
}
```

### 3. **Incomplete Logic Blocks** ✅ FIXED
**Problem**: The `reject` and `request_changes` actions had incomplete implementation.

**Fix**: Completed the logic for all action types and added proper fallback.

### 4. **Analytics Creation Error Handling** ✅ FIXED
**Problem**: If analytics creation failed, it would fail the entire approval process.

**Fix**: Wrapped analytics creation in try-catch to prevent approval failure:
```typescript
try {
  await prisma.certificationAnalytics.create({ ... });
} catch (analyticsError) {
  console.warn('Failed to log approval analytics:', analyticsError);
  // Don't fail the entire approval process if analytics fails
}
```

### 5. **Better Error Messages** ✅ FIXED
**Problem**: Generic error messages made debugging difficult.

**Fix**: Added specific error handling for common database issues:
```typescript
if (error.message.includes('foreign key constraint')) {
  return NextResponse.json(
    { error: 'Invalid user reference - please ensure the approver exists' },
    { status: 400 }
  );
}
```

## How to Debug Approval Issues

### Using the Debug Script

A debug script has been created to help troubleshoot approval issues:

```bash
node scripts/debug-approval.js <moduleId> <smeId>
```

**Example:**
```bash
node scripts/debug-approval.js "123e4567-e89b-12d3-a456-426614174000" "123e4567-e89b-12d3-a456-426614174001"
```

The script will check:
- ✅ SME user exists and has correct role
- ✅ Training module exists
- ✅ SME has permission to approve the module
- ✅ Current approval status
- ✅ Any existing certifications

### Manual Database Checks

If you need to check the database manually:

1. **Check if user exists:**
```sql
SELECT id, email, name, role FROM "User" WHERE id = '<smeId>';
```

2. **Check training module and permissions:**
```sql
SELECT 
  tm.id,
  tm.title,
  tm."isApproved",
  tm."approvedBy",
  p.title as procedure_title,
  lt."userId" as creator_id
FROM "TrainingModule" tm
JOIN "Procedure" p ON tm."procedureId" = p.id
JOIN "LearningTask" lt ON p."taskId" = lt.id
WHERE tm.id = '<moduleId>';
```

3. **Check for existing certifications:**
```sql
SELECT * FROM "Certification" 
WHERE "moduleId" = '<moduleId>' AND "userId" = '<smeId>';
```

## Common Error Scenarios

### Error: "SME user not found"
- **Cause**: The SME ID doesn't exist in the users table
- **Solution**: Verify the user ID is correct or create the user

### Error: "You do not have permission to approve this module"
- **Cause**: The SME is trying to approve a module they didn't create
- **Solution**: Only the SME who created the original procedure can approve its training module

### Error: "Invalid user reference - please ensure the approver exists"
- **Cause**: Database foreign key constraint violation
- **Solution**: Verify the SME user exists in the database

### Error: "Training module not found"
- **Cause**: The module ID is incorrect or the module was deleted
- **Solution**: Verify the module ID exists in the TrainingModule table

## Prevention

To prevent approval issues in the future:

1. **Always validate user roles** when creating SME accounts
2. **Use the debug script** to test approval workflows
3. **Monitor error logs** for foreign key constraint violations
4. **Ensure proper authentication** in the frontend before making approval requests

## API Endpoints

The approval process uses:
- `GET /api/sme/training/pending` - Get modules pending approval
- `POST /api/sme/training/pending` - Approve/reject modules

Required parameters for POST:
- `moduleId` (string): Training module ID
- `smeId` (string): SME user ID  
- `action` (string): 'approve', 'reject', or 'request_changes'
- `feedback` (string, optional): Approval/rejection feedback 
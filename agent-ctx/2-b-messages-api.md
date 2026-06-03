# Task 2-b: Update Messages API for Chat Session Support

## Summary
Updated `/src/app/api/messages/route.ts` to support filtering by `chatSessionId`.

## Changes Made

### GET Handler
- Added `chatSessionId` query parameter extraction from searchParams
- Added conditional filter: `if (chatSessionId) where.chatSessionId = chatSessionId`
- Backward compatible: if `chatSessionId` is not provided, existing behavior is preserved

### POST Handler
- Added `chatSessionId` to destructured body fields
- Added `chatSessionId: chatSessionId || null` to the `db.message.create` data object
- Backward compatible: if `chatSessionId` is not provided, it defaults to null (no session association)

## Schema Verification
The Prisma schema already had the `chatSessionId` field on the `Message` model:
```prisma
chatSessionId String?
chatSession   ChatSession? @relation(fields: [chatSessionId], references: [id], onDelete: SetNull)
```

## Lint
0 errors, all clean.

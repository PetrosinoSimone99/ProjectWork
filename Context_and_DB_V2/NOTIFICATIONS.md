# Notifications

Notifications are stored in the database and are available through three JWT-protected endpoints. Both regular users and staff can access only their own notifications. Inactive accounts receive `403`, following the existing account policy.

## Database installation

The selected dump is `barattolo_14112026_notifications.sql`. It contains the complete structure from `barattolo_14112026.sql` plus the new `notifications` table. It contains no demo users, categories, services or notifications.

- **Fresh database:** select a new empty database in phpMyAdmin and import `barattolo_14112026_notifications.sql`.
- **Existing database based on `barattolo_14112026.sql`:** select that database and import only `add_notifications.sql`, once. This adds the table without changing existing tables or data. Running it again reports that the table already exists.

Do not import the complete dump over an existing database. Do not run historical migrations or a Doctrine schema update to install this feature. No local application database is updated by the code changes themselves.

The table stores the recipient (`user_id`), a free-form event `type` of 1–100 characters, the `message`, optional JSON `data`, and UTC creation/read dates. `read_at = NULL` means unread. Deleting the recipient deletes their notifications through a foreign key. Indexes support the personal inbox and unread count. The JSON column uses MariaDB's JSON-compatible LONGTEXT representation with a `json_valid` constraint, like the existing dump.

## Creating a notification from PHP

Inject `App\Service\NotificationService` into the manager that handles an event, then call:

```php
$notification = $notificationService->notify(
    $recipient,
    'AGREEMENT_RECEIVED',
    'You received a new exchange proposal.',
    ['agreementId' => $agreement->getId()],
);
```

The recipient must be an existing, managed `User` loaded through Doctrine. `data` is optional and must contain JSON-serializable values. The service trims the type and message and rejects an empty type/message or a type longer than 100 characters. No predefined list of event types is required.

`notify()` persists and flushes the notification and returns it with its ID. A Doctrine flush also saves other pending entity changes. To save a business operation and its notification together, use the same entity manager and an outer transaction:

```php
$entityManager->wrapInTransaction(function () use ($entityManager, $notificationService, $recipient) {
    // Apply and persist the business changes here.
    // Flush first if the notification data needs a newly generated entity ID.
    $notificationService->notify($recipient, 'EXAMPLE_EVENT', 'An example event occurred.');
    // An exception here rolls back both the business changes and the notification.
});
```

**Staff operations now call `notify()`.** Chat, agreements, queues, registration and other business operations are still left for a colleague to connect. There is no public POST endpoint, polling job, push delivery or email delivery.

## Connected staff events

| Staff operation | Recipient | Type | Data |
| --- | --- | --- | --- |
| Promote an account to staff | Promoted user | `USER_PROMOTED` | `userId` |
| Deactivate or reactivate an account | Changed user | `USER_STATUS_CHANGED` | `userId`, `accountStatus` |
| Claim a report | Reporter | `REPORT_CLAIMED` | `reportId`, `status: IN_REVIEW` |
| Confirm or reject a report | Reporter | `REPORT_REVIEWED` | `reportId`, final `status` |
| Restore another user's service as staff | Service owner | `SERVICE_RESTORED` | `serviceId` |

The messages distinguish deactivation from reactivation and confirmation from rejection. Report notifications never contain the original reason, private review notes or the reporting user's identity. They are sent to the reporter, not the reported user.

Notifications are saved inside the same transaction as the staff operation and its history. If notification storage fails, all three changes roll back. Existing row locks prevent competing staff operations from creating duplicate notifications. Repeated promotions, unchanged account statuses, repeated restores and rejected operations do not create notifications. Staff restoring their own service do not notify themselves, and ordinary user restores do not generate notifications.

The existing access rules still block inactive users. A deactivation notification is stored immediately, but its recipient can read it only after reactivation. No alternative delivery channel is added.

## Reading notifications

Send `Authorization: Bearer <token>` on every request.

`GET /api/notifications?page=1&limit=20&unreadOnly=false`

- `page`: positive integer, default `1`.
- `limit`: positive integer up to `50`, default `20`.
- `unreadOnly`: exactly `true` or `false`, default `false`.
- Unknown or invalid query parameters return `400`.

```json
{
  "notifications": [
    {
      "id": 1,
      "type": "AGREEMENT_RECEIVED",
      "message": "You received a new exchange proposal.",
      "data": {"agreementId": 42},
      "createdAt": "2026-11-14T12:00:00+00:00",
      "readAt": null
    }
  ],
  "pagination": {"page": 1, "limit": 20, "totalItems": 1, "totalPages": 1},
  "unreadCount": 1
}
```

Results are ordered by creation date descending, then ID descending. `totalItems` counts the filtered results; `unreadCount` counts all the current user's unread notifications, independent of pagination and filtering. An empty result returns an empty array; an empty inbox has `totalPages: 0`. Reading the list does not mark anything as read. Dates are ISO 8601 UTC; optional `data` and `readAt` can be `null`.

## Marking a notification as read

`PATCH /api/notifications/1/read` — no request body is needed.

Returns `200` with `{"notification": {...}}`, using the same notification fields as GET. Only the first call sets `readAt`; later calls preserve that timestamp, including overlapping requests. There is no mark-as-unread operation in this version.

## Deleting a notification

`DELETE /api/notifications/1`

Returns `204` with no response body and permanently deletes the notification. There is no soft delete or restore operation.

For PATCH and DELETE, a missing notification or a notification owned by another user returns the same `404` response: `{"error":"Notification not found."}`. All three endpoints return `401` without a valid JWT and `403` for an inactive account.

## Tests

From `Backend`, run `php bin/phpunit --filter NotificationControllerTest`. The tests use the isolated SQLite test database and build its structure from the selected SQL dump. They cover persistence, transaction rollback, ownership, staff access, inactive users, ordering, pagination, unread counts, read/delete behavior, JSON validation and recipient deletion. PHP needs the PDO SQLite extension enabled.

Run `php bin/phpunit --filter "StaffNotificationTest|DeletedServiceControllerTest"` for staff event messages, recipients, duplicate prevention and rollback after notification failures. `StaffControllerTest` also checks single-notification behavior under concurrent requests when `STAFF_TEST_DATABASE_URL` points to a disposable MySQL `staff_check_*` database (the tests use the `_test` suffix). Never point tests at an application database.

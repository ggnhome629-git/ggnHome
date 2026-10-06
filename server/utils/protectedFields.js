// Fields a listing owner must never set from the request body. Approval
// state, ranking, ownership and scraped-source tracking are server-managed.
const PROTECTED_PROPERTY_FIELDS = [
  "_id",
  "isActive",
  "isPostedNew",
  "isEdited",
  "rankScore",
  "views",
  "owner",
  "ownerId",
  "ownerType",
  "agentUserId",
  "sourcePortal",
  "sourceListingId",
  "sourceUrl",
  "sourceStatus",
  "sourceCheckedAt",
  "sourceRemovalFlaggedAt",
  "createdAt",
  "updatedAt",
];

/** Removes server-managed fields from a request body in place and returns it. */
function stripProtectedFields(body) {
  if (!body || typeof body !== "object") return body;
  PROTECTED_PROPERTY_FIELDS.forEach((key) => {
    delete body[key];
  });
  Object.keys(body).forEach((key) => {
    // Mongo operators and dotted paths into protected fields ("rankScore.$x").
    if (key.startsWith("$") || PROTECTED_PROPERTY_FIELDS.includes(key.split(".")[0])) delete body[key];
  });
  return body;
}

module.exports = { PROTECTED_PROPERTY_FIELDS, stripProtectedFields };

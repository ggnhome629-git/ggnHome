// Optional sale-listing profile fields sent by the post-property forms.
// Values are checked by the SaleProperty schema (enums / min).
function saleProfileFields(body = {}) {
  const asList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
  const optionalNumber = (v) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));
  return {
    propertyType: body.propertyType || undefined,
    furnishing: body.furnishing || undefined,
    parking: body.parking || undefined,
    totalFloors: optionalNumber(body.totalFloors),
    floorNumber: optionalNumber(body.floorNumber),
    possessionStatus: body.possessionStatus || undefined,
    propertyAge: body.propertyAge || undefined,
    appliances: asList(body["appliances[]"] ?? body.appliances).map(String).slice(0, 30),
  };
}

module.exports = { saleProfileFields };

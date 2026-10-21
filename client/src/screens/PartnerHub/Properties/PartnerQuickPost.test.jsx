import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PartnerQuickPost from "./PartnerQuickPost";
import { checkAddressAgainstGps, haversineMeters } from "./quickPostHelpers";

// The form only needs navigation; this project's older Jest cannot load the real router package.
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));

let sentForm = null;

beforeEach(() => {
  sentForm = null;
  localStorage.clear();
  window.scrollTo = jest.fn();
  global.URL.createObjectURL = jest.fn(() => "blob:photo");
  global.URL.revokeObjectURL = jest.fn();

  // GPS: one good reading.
  const geolocation = {
    watchPosition: jest.fn((ok) => { setTimeout(() => ok({ coords: { latitude: 28.4212, longitude: 77.0725, accuracy: 12 } }), 0); return 1; }),
    clearWatch: jest.fn(),
  };
  Object.defineProperty(global.navigator, "geolocation", { value: geolocation, configurable: true });

  global.fetch = jest.fn(async (url) => ({
    ok: true,
    status: 200,
    json: async () => (String(url).includes("/location/reverse")
      ? { success: true, address: "Sushant Lok III, Sector 57, Gurgaon", sector: "Sector 57", inServiceArea: true }
      : { success: true, suggestions: [] }),
  }));

  global.XMLHttpRequest = class {
    constructor() { this.upload = {}; }
    open(method, url) { this.url = url; }
    setRequestHeader() {}
    send(form) {
      sentForm = form;
      setTimeout(() => {
        this.status = 201;
        this.responseText = JSON.stringify({ property: { title: "3 BHK Flat for Rent in Sector 57, Gurugram" } });
        this.onload();
      }, 0);
    }
  };
});

const renderForm = () => render(<PartnerQuickPost />);
const button = (name) => screen.getByRole("button", { name });

test("blocks Next on step 1 until a photo is added", () => {
  renderForm();
  fireEvent.click(button(/next/i));
  expect(screen.getByText(/Add at least 1 photo/i)).toBeInTheDocument();
});

test("a partner can post a rental in three short screens and the server gets only the essentials", async () => {
  const { container } = renderForm();

  // 1. photos
  const gallery = container.querySelector("input[type=file][multiple]");
  fireEvent.change(gallery, { target: { files: [new File(["x"], "front.jpg", { type: "image/jpeg" })] } });
  await screen.findByText(/1 photo added/i);
  fireEvent.click(button(/next/i));

  // 2. the property
  fireEvent.click(button(/^Rent/));
  fireEvent.click(button(/^Flat/));
  fireEvent.click(button("3"));
  fireEvent.click(button(/Typical size: 1,500/));
  fireEvent.click(button("₹20,000"));
  fireEvent.click(button(/next/i));

  // 3. the place: GPS fills the address and sector
  fireEvent.click(button(/use my location/i));
  await screen.findByText("Sector 57");
  expect(screen.getByDisplayValue(/Sushant Lok III/)).toBeInTheDocument();

  // publishing without the owner's number is refused with a clear message
  fireEvent.click(button(/publish property/i));
  expect(screen.getByText(/owner's 10-digit mobile number/i)).toBeInTheDocument();
  expect(sentForm).toBeNull();

  fireEvent.change(screen.getByPlaceholderText("10-digit number"), { target: { value: "9876543210" } });
  fireEvent.click(button(/publish property/i));
  await screen.findByText(/Property published!/i);

  // what was sent: no title, no description, no bathrooms: the server writes those
  expect(sentForm.get("purpose")).toBe("rent");
  expect(sentForm.get("propertyType")).toBe("apartment");
  expect(sentForm.get("bedrooms")).toBe("3");
  expect(sentForm.get("area")).toBe("1500");
  expect(sentForm.get("price")).toBe("20000");
  expect(sentForm.get("sector")).toBe("Sector 57");
  expect(sentForm.get("address")).toMatch(/Sushant Lok III/);
  expect(sentForm.get("latitude")).toBe("28.4212");
  expect(sentForm.get("ownerMobile")).toBe("9876543210");
  expect(sentForm.getAll("images")).toHaveLength(1);
  expect(sentForm.get("imageCategories")).toBe('["front"]');
  ["title", "description", "bathrooms"].forEach((field) => expect(sentForm.get(field)).toBeNull());
  expect(screen.getByText("3 BHK Flat for Rent in Sector 57, Gurugram")).toBeInTheDocument();
});

test("plot sizes in gaj are converted to square feet", async () => {
  const { container } = renderForm();
  fireEvent.change(container.querySelector("input[type=file][multiple]"), { target: { files: [new File(["x"], "p.jpg", { type: "image/jpeg" })] } });
  await screen.findByText(/1 photo added/i);
  fireEvent.click(button(/next/i));
  fireEvent.click(button(/^Sale/));
  fireEvent.click(button(/^Plot/));
  fireEvent.click(button("200 gaj"));
  expect(screen.getByText(/= 1,800 sq ft/)).toBeInTheDocument();
});

describe("address check against the phone's GPS", () => {
  const gps = { latitude: 28.4212, longitude: 77.0725 };
  test("same place matches, far away asks for confirmation", () => {
    expect(checkAddressAgainstGps(gps, { latitude: 28.4215, longitude: 77.0727, source: "search" }).status).toBe("match");
    expect(checkAddressAgainstGps(gps, { latitude: 28.4500, longitude: 77.0300, source: "search" }).status).toBe("far");
  });
  test("an address that came from the GPS itself is not compared", () => {
    expect(checkAddressAgainstGps(gps, { latitude: 28.5, longitude: 77.1, source: "gps" })).toBeNull();
  });
  test("distance helper is sane (about 1.1 km per 0.01 degree of latitude)", () => {
    const d = haversineMeters(28.42, 77.07, 28.43, 77.07);
    expect(d).toBeGreaterThan(1050);
    expect(d).toBeLessThan(1150);
  });
});

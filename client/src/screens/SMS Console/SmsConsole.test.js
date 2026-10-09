import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SmsConsole from "./SmsConsole";

const overview = {
  phones: [
    {
      deviceId: "p1",
      name: "Office phone",
      online: true,
      lastSeen: new Date().toISOString(),
      appVersion: "2.0",
      ggnhome: { enabled: true, sentToday: 4, sentTotal: 40 },
      shine: { enabled: false, sentToday: 0, sentTotal: 0 },
    },
  ],
  ggnhome: { pending: 0, settings: { mode: "auto", effective: { dailyLimit: 90, hourlyLimit: 30, gapMinSec: 8, gapMaxSec: 14 }, hardCaps: { daily: 200, hourly: 60 } } },
  shine: {
    ok: true,
    settings: {
      mode: "auto",
      paused: false,
      updatedAt: "2030-01-01",
      effective: { dailyLimit: 90, hourlyLimit: 30, gapMinSec: 8, gapMaxSec: 14, lunchQuota: 30, lunchStart: "13:00", lunchEnd: "14:00", nightStart: "21:00", nightEnd: "23:00", days: [0, 1, 2, 3, 4, 5, 6] },
      hardCaps: { daily: 200, hourly: 60 },
    },
    sheets: [{ sheet: "Meta Sheet", text: "Hi {name}", auto: false, total: 100, sent: 10, delivered: 0, failed: 0, invalid: 0, remaining: 90, etaDays: null }],
    devices: [],
  },
};

beforeEach(() => {
  sessionStorage.clear();
  global.fetch = jest.fn(async (url, opts = {}) => {
    const path = String(url).split("/api/sms-console")[1];
    if (path === "/login") {
      const ok = JSON.parse(opts.body).password === "right";
      return { ok, status: ok ? 200 : 401, json: async () => (ok ? { token: "t" } : { message: "Wrong password" }) };
    }
    if (path === "/overview") return { ok: true, status: 200, json: async () => overview };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  });
});

test("shows only a password box until signed in, and rejects a wrong password", async () => {
  render(<SmsConsole />);
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.queryByText(/Phones/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "nope" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByText("Wrong password")).toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([u]) => String(u).includes("/overview"))).toBe(false);
});

test("after sign-in lists the phones with a switch per service, and the Shine One times", async () => {
  render(<SmsConsole />);
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "right" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByDisplayValue("Office phone")).toBeInTheDocument();
  expect(screen.getByText("1 of 1 phones online")).toBeInTheDocument();
  expect(screen.getByText(/4 today/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: /Shine One Estate/ }));
  expect(await screen.findByDisplayValue("13:00")).toBeInTheDocument();
  expect(screen.getByDisplayValue("21:00")).toBeInTheDocument();
  expect(screen.getByText("Meta Sheet")).toBeInTheDocument();
  expect(screen.getByText("Remaining 90")).toBeInTheDocument();

  // Changing a time and saving sends it to the server
  fireEvent.change(screen.getByDisplayValue("13:00"), { target: { value: "12:30" } });
  fireEvent.click(screen.getByRole("button", { name: /save times and limits/i }));
  await waitFor(() => {
    const call = global.fetch.mock.calls.find(([u, o]) => String(u).endsWith("/shine/settings") && o && o.method === "PUT");
    expect(call).toBeTruthy();
    expect(JSON.parse(call[1].body)).toMatchObject({ lunchStart: "12:30", nightStart: "21:00" });
  });
});

import { render, screen } from "@testing-library/react";
import AdminPing from "./AdminPing";

afterEach(() => {
  delete global.fetch;
});

test("shows the API's answer without any sign-in", async () => {
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ message: "Admin route is working!" }) }));
  render(<AdminPing />);
  expect(await screen.findByText("Admin route is working!")).toBeInTheDocument();
  expect(screen.getByText("API is up")).toBeInTheDocument();
  expect(String(global.fetch.mock.calls[0][0])).toMatch(/\/admin\/ping$/);
});

test("says so when the API does not answer", async () => {
  global.fetch = jest.fn(async () => {
    throw new Error("down");
  });
  render(<AdminPing />);
  expect(await screen.findByText("API problem")).toBeInTheDocument();
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { api } from "./lib/api";
import App from "./App";
import { afterEach, vi } from "vitest";

describe("App", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the landing page headline", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("No session"));
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    const headline = await screen.findByText(
      /Grow better cotton with zone-wise field intelligence/i,
    );
    expect(headline).toBeInTheDocument();
  });
});

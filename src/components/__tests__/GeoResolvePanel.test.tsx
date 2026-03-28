import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeoResolvePanel } from "../GeoResolvePanel";
import type { GeoResolveResult } from "../../lib/types";

const apiMock = vi.hoisted(() => ({
  georesolve: vi.fn(),
  georesolveCurrentLocation: vi.fn(),
  profileByGeoid: vi.fn(),
  profile: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  GeoCompareApi: class {
    constructor() {
      return apiMock;
    }
  },
}));

vi.mock("../DetailPanel", () => ({
  DetailPanel: () => <div data-testid="detail-panel" />,
}));

const resolvedResponse: GeoResolveResult = {
  input: {
    address: "1600 Pennsylvania Ave NW, Washington, DC 20500",
  },
  matched_address: "1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500",
  coordinates: {
    latitude: 38.898754,
    longitude: -77.036545,
  },
  geographies: {
    state: {
      kind: "state",
      name: "District of Columbia",
      geoid: "11",
      summary_level: "040",
      source_layer: "States",
    },
    county: {
      kind: "county",
      name: "District of Columbia",
      geoid: "11001",
      summary_level: "050",
      source_layer: "Counties",
    },
    place: {
      kind: "place",
      name: "Washington",
      geoid: "1150000",
      summary_level: "160",
      source_layer: "Incorporated Places",
    },
    zcta: {
      kind: "zcta",
      name: "20500",
      geoid: "20500",
      summary_level: "860",
      source_layer: "2020 Census ZIP Code Tabulation Areas",
    },
    tract: {
      kind: "tract",
      name: "001001",
      geoid: "11001001001",
      summary_level: "140",
      source_layer: "Census Tracts",
    },
  },
  geoids: {
    state: "11",
    county: "11001",
    place: "1150000",
    zcta: "20500",
    tract: "11001001001",
  },
  metadata: {
    geocoder: "census",
    geography_source: "census",
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
  },
};

function renderPanel() {
  return render(
    <GeoResolvePanel
      comparedGeoids={new Set()}
      config={{ baseUrl: "/api", georesolveBaseUrl: "/georesolve-api" }}
      onAddCompareProfile={vi.fn()}
      onBack={vi.fn()}
      onFeedback={vi.fn()}
    />,
  );
}

function installGeolocationMock(
  implementation: (success: PositionCallback, error?: PositionErrorCallback) => void,
) {
  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn(implementation),
    },
  });
}

describe("GeoResolvePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.georesolve.mockResolvedValue(resolvedResponse);
    apiMock.georesolveCurrentLocation.mockResolvedValue(resolvedResponse);
    installGeolocationMock(() => {});
  });

  it.each([
    "1600 Pennsylvania Ave NW, Washington, DC 20500",
    "38.8899, -77.0091",
    "https://maps.google.com/?q=38.8899,-77.0091",
  ])("submits freeform GeoResolve query input for %s", async (query) => {
    renderPanel();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Query"), query);
    await user.click(screen.getByRole("button", { name: "Resolve" }));

    await waitFor(() => {
      expect(apiMock.georesolve).toHaveBeenCalledWith(query);
    });

    expect(await screen.findByText("38.898754, -77.036545")).toBeInTheDocument();
    expect(screen.getByText("11001001001")).toBeInTheDocument();
  });

  it("uses browser geolocation for current-location lookup", async () => {
    installGeolocationMock((success) => {
      success({
        coords: {
          latitude: 38.8899,
          longitude: -77.0091,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });

    renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Use current location" }));

    await waitFor(() => {
      expect(apiMock.georesolveCurrentLocation).toHaveBeenCalledWith(38.8899, -77.0091);
    });
  });

  it("shows a clear permission error for current-location failure", async () => {
    installGeolocationMock((_, error) => {
      error?.({
        code: 1,
        message: "Permission denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    });

    renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Use current location" }));

    expect(await screen.findByText("Location permission was denied.")).toBeInTheDocument();
  });

  it.each([
    ["Request failed with status 400", "Please enter an address, lat/lon, or a map URL that includes coordinates."],
    ["Request failed with status 404", "GeoResolve could not match that query."],
    ["Request failed with status 502", "GeoResolve is unavailable right now. The georesolve API may not be deployed yet."],
  ])("maps backend errors cleanly for %s", async (errorMessage, expectedMessage) => {
    apiMock.georesolve.mockRejectedValueOnce(new Error(errorMessage));

    renderPanel();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Query"), "bad input");
    await user.click(screen.getByRole("button", { name: "Resolve" }));

    expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
  });
});

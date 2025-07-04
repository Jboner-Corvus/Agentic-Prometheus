import type { SSEClientTransportOptions } from "@modelcontextprotocol/sdk/client/sse.js";
import type { ClientRequest } from "@modelcontextprotocol/sdk/types.js";

// Mock fetch
const mockFetch = jest.fn().mockResolvedValue({
  json: () => Promise.resolve({ status: "ok" }),
});

beforeAll(() => {
  global.fetch = mockFetch;
});

beforeEach(() => {
  mockFetch.mockClear();
});
import { act, renderHook } from "@testing-library/react";
import { z } from "zod";

import { DEFAULT_INSPECTOR_CONFIG } from "../../constants";
import { useConnection } from "../useConnection";

// Mock the SDK dependencies
const mockRequest = jest.fn().mockResolvedValue({ test: "response" });
const mockClient = {
  close: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  getInstructions: jest.fn(),
  getServerCapabilities: jest.fn(),
  getServerVersion: jest.fn(),
  notification: jest.fn(),
  request: mockRequest,
  setNotificationHandler: jest.fn(),
  setRequestHandler: jest.fn(),
};

// Mock transport instances
const mockSSETransport: {
  options: SSEClientTransportOptions | undefined;
  start: jest.Mock;
  url: undefined | URL;
} = {
  options: undefined,
  start: jest.fn(),
  url: undefined,
};

const mockStreamableHTTPTransport: {
  options: SSEClientTransportOptions | undefined;
  start: jest.Mock;
  url: undefined | URL;
} = {
  options: undefined,
  start: jest.fn(),
  url: undefined,
};

jest.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
}));

jest.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: jest.fn((url, options) => {
    mockSSETransport.url = url;
    mockSSETransport.options = options;
    return mockSSETransport;
  }),
  SseError: jest.fn(),
}));

jest.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: jest.fn((url, options) => {
    mockStreamableHTTPTransport.url = url;
    mockStreamableHTTPTransport.options = options;
    return mockStreamableHTTPTransport;
  }),
}));

jest.mock("@modelcontextprotocol/sdk/client/auth.js", () => ({
  auth: jest.fn().mockResolvedValue("AUTHORIZED"),
}));

// Mock the toast hook
jest.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the auth provider
jest.mock("../../auth", () => ({
  InspectorOAuthClientProvider: jest.fn().mockImplementation(() => ({
    tokens: jest.fn().mockResolvedValue({ access_token: "mock-token" }),
  })),
}));

describe("useConnection", () => {
  const defaultProps = {
    args: "",
    command: "",
    config: DEFAULT_INSPECTOR_CONFIG,
    env: {},
    sseUrl: "http://localhost:8080",
    transportType: "sse" as const,
  };

  describe("Request Configuration", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("uses the default config values in makeRequest", async () => {
      const { result } = renderHook(() => useConnection(defaultProps));

      // Connect the client
      await act(async () => {
        await result.current.connect();
      });

      // Wait for state update
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const mockRequest: ClientRequest = {
        method: "ping",
        params: {},
      };

      const mockSchema = z.object({
        test: z.string(),
      });

      await act(async () => {
        await result.current.makeRequest(mockRequest, mockSchema);
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        mockRequest,
        mockSchema,
        expect.objectContaining({
          maxTotalTimeout:
            DEFAULT_INSPECTOR_CONFIG.MCP_REQUEST_MAX_TOTAL_TIMEOUT.value,
          resetTimeoutOnProgress:
            DEFAULT_INSPECTOR_CONFIG.MCP_REQUEST_TIMEOUT_RESET_ON_PROGRESS
              .value,
          timeout: DEFAULT_INSPECTOR_CONFIG.MCP_SERVER_REQUEST_TIMEOUT.value,
        }),
      );
    });

    test("overrides the default config values when passed in options in makeRequest", async () => {
      const { result } = renderHook(() => useConnection(defaultProps));

      // Connect the client
      await act(async () => {
        await result.current.connect();
      });

      // Wait for state update
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const mockRequest: ClientRequest = {
        method: "ping",
        params: {},
      };

      const mockSchema = z.object({
        test: z.string(),
      });

      await act(async () => {
        await result.current.makeRequest(mockRequest, mockSchema, {
          maxTotalTimeout: 2000,
          resetTimeoutOnProgress: false,
          timeout: 1000,
        });
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        mockRequest,
        mockSchema,
        expect.objectContaining({
          maxTotalTimeout: 2000,
          resetTimeoutOnProgress: false,
          timeout: 1000,
        }),
      );
    });
  });

  test("throws error when mcpClient is not connected", async () => {
    const { result } = renderHook(() => useConnection(defaultProps));

    const mockRequest: ClientRequest = {
      method: "ping",
      params: {},
    };

    const mockSchema = z.object({
      test: z.string(),
    });

    await expect(
      result.current.makeRequest(mockRequest, mockSchema),
    ).rejects.toThrow("MCP client not connected");
  });

  describe("URL Port Handling", () => {
    const SSEClientTransport = jest.requireMock(
      "@modelcontextprotocol/sdk/client/sse.js",
    ).SSEClientTransport;
    const StreamableHTTPClientTransport = jest.requireMock(
      "@modelcontextprotocol/sdk/client/streamableHttp.js",
    ).StreamableHTTPClientTransport;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("preserves HTTPS port number when connecting", async () => {
      const props = {
        ...defaultProps,
        sseUrl: "https://example.com:8443/api",
        transportType: "sse" as const,
      };

      const { result } = renderHook(() => useConnection(props));

      await act(async () => {
        await result.current.connect();
      });

      const call = SSEClientTransport.mock.calls[0][0];
      expect(call.toString()).toContain(
        "url=https%3A%2F%2Fexample.com%3A8443%2Fapi",
      );
    });

    test("preserves HTTP port number when connecting", async () => {
      const props = {
        ...defaultProps,
        sseUrl: "http://localhost:3000/api",
        transportType: "sse" as const,
      };

      const { result } = renderHook(() => useConnection(props));

      await act(async () => {
        await result.current.connect();
      });

      const call = SSEClientTransport.mock.calls[0][0];
      expect(call.toString()).toContain(
        "url=http%3A%2F%2Flocalhost%3A3000%2Fapi",
      );
    });

    test("uses default port for HTTPS when not specified", async () => {
      const props = {
        ...defaultProps,
        sseUrl: "https://example.com/api",
        transportType: "sse" as const,
      };

      const { result } = renderHook(() => useConnection(props));

      await act(async () => {
        await result.current.connect();
      });

      const call = SSEClientTransport.mock.calls[0][0];
      expect(call.toString()).toContain("url=https%3A%2F%2Fexample.com%2Fapi");
      expect(call.toString()).not.toContain("%3A443");
    });

    test("preserves port number in streamable-http transport", async () => {
      const props = {
        ...defaultProps,
        sseUrl: "https://example.com:8443/api",
        transportType: "streamable-http" as const,
      };

      const { result } = renderHook(() => useConnection(props));

      await act(async () => {
        await result.current.connect();
      });

      const call = StreamableHTTPClientTransport.mock.calls[0][0];
      expect(call.toString()).toContain(
        "url=https%3A%2F%2Fexample.com%3A8443%2Fapi",
      );
    });
  });

  describe("Proxy Authentication Headers", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset the mock transport objects
      mockSSETransport.url = undefined;
      mockSSETransport.options = undefined;
      mockStreamableHTTPTransport.url = undefined;
      mockStreamableHTTPTransport.options = undefined;
    });

    test("sends X-MCP-Proxy-Auth header when proxy auth token is configured", async () => {
      const propsWithProxyAuth = {
        ...defaultProps,
        config: {
          ...DEFAULT_INSPECTOR_CONFIG,
          MCP_PROXY_AUTH_TOKEN: {
            ...DEFAULT_INSPECTOR_CONFIG.MCP_PROXY_AUTH_TOKEN,
            value: "test-proxy-token",
          },
        },
      };

      const { result } = renderHook(() => useConnection(propsWithProxyAuth));

      await act(async () => {
        await result.current.connect();
      });

      // Check that the transport was created with the correct headers
      expect(mockSSETransport.options).toBeDefined();
      expect(mockSSETransport.options?.requestInit).toBeDefined();

      expect(mockSSETransport.options?.requestInit?.headers).toHaveProperty(
        "X-MCP-Proxy-Auth",
        "Bearer test-proxy-token",
      );
      expect(mockSSETransport?.options?.eventSourceInit?.fetch).toBeDefined();

      // Verify the fetch function includes the proxy auth header
      const mockFetch = mockSSETransport.options?.eventSourceInit?.fetch;
      const testUrl = "http://test.com";
      await mockFetch?.(testUrl, {
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "text/event-stream",
        },
        mode: "cors",
        redirect: "follow",
        signal: new AbortController().signal,
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(
        (global.fetch as jest.Mock).mock.calls[0][1].headers,
      ).toHaveProperty("X-MCP-Proxy-Auth", "Bearer test-proxy-token");
      expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe(testUrl);
      expect(
        (global.fetch as jest.Mock).mock.calls[1][1].headers,
      ).toHaveProperty("X-MCP-Proxy-Auth", "Bearer test-proxy-token");
    });

    test("does NOT send Authorization header for proxy auth", async () => {
      const propsWithProxyAuth = {
        ...defaultProps,
        config: {
          ...DEFAULT_INSPECTOR_CONFIG,
          proxyAuthToken: "test-proxy-token",
        },
      };

      const { result } = renderHook(() => useConnection(propsWithProxyAuth));

      await act(async () => {
        await result.current.connect();
      });

      // Check that Authorization header is NOT used for proxy auth
      expect(mockSSETransport.options?.requestInit?.headers).not.toHaveProperty(
        "Authorization",
        "Bearer test-proxy-token",
      );
    });

    test("preserves server Authorization header when proxy auth is configured", async () => {
      const propsWithBothAuth = {
        ...defaultProps,
        bearerToken: "server-auth-token",
        config: {
          ...DEFAULT_INSPECTOR_CONFIG,
          MCP_PROXY_AUTH_TOKEN: {
            ...DEFAULT_INSPECTOR_CONFIG.MCP_PROXY_AUTH_TOKEN,
            value: "test-proxy-token",
          },
        },
      };

      const { result } = renderHook(() => useConnection(propsWithBothAuth));

      await act(async () => {
        await result.current.connect();
      });

      // Check that both headers are present and distinct
      const headers = mockSSETransport.options?.requestInit?.headers;
      expect(headers).toHaveProperty(
        "Authorization",
        "Bearer server-auth-token",
      );
      expect(headers).toHaveProperty(
        "X-MCP-Proxy-Auth",
        "Bearer test-proxy-token",
      );
    });

    test("sends X-MCP-Proxy-Auth in health check requests", async () => {
      const fetchMock = global.fetch as jest.Mock;
      fetchMock.mockClear();

      const propsWithProxyAuth = {
        ...defaultProps,
        config: {
          ...DEFAULT_INSPECTOR_CONFIG,
          MCP_PROXY_AUTH_TOKEN: {
            ...DEFAULT_INSPECTOR_CONFIG.MCP_PROXY_AUTH_TOKEN,
            value: "test-proxy-token",
          },
        },
      };

      const { result } = renderHook(() => useConnection(propsWithProxyAuth));

      await act(async () => {
        await result.current.connect();
      });

      // Find the health check call
      const healthCheckCall = fetchMock.mock.calls.find(
        (call) => call[0].pathname === "/health",
      );

      expect(healthCheckCall).toBeDefined();
      expect(healthCheckCall[1].headers).toHaveProperty(
        "X-MCP-Proxy-Auth",
        "Bearer test-proxy-token",
      );
    });

    test("works correctly with streamable-http transport", async () => {
      const propsWithStreamableHttp = {
        ...defaultProps,
        config: {
          ...DEFAULT_INSPECTOR_CONFIG,
          MCP_PROXY_AUTH_TOKEN: {
            ...DEFAULT_INSPECTOR_CONFIG.MCP_PROXY_AUTH_TOKEN,
            value: "test-proxy-token",
          },
        },
        transportType: "streamable-http" as const,
      };

      const { result } = renderHook(() =>
        useConnection(propsWithStreamableHttp),
      );

      await act(async () => {
        await result.current.connect();
      });

      // Check that the streamable HTTP transport was created with the correct headers
      expect(mockStreamableHTTPTransport.options).toBeDefined();
      expect(
        mockStreamableHTTPTransport.options?.requestInit?.headers,
      ).toHaveProperty("X-MCP-Proxy-Auth", "Bearer test-proxy-token");
    });
  });
});

import jwt from "jsonwebtoken";
import { socketAuthMiddleware } from "../../src/socket";

describe("socketAuthMiddleware", () => {
  const userId = "user_123";
  let next: jest.Mock;

  const makeSocket = (overrides: { auth?: any; headers?: any } = {}) => ({
    handshake: {
      auth: overrides.auth ?? {},
      headers: overrides.headers ?? {},
    },
    data: {} as { userId?: string },
  });

  const sign = (payload: object = { userId }) =>
    jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string);

  beforeEach(() => {
    next = jest.fn();
  });

  it("authenticates using handshake.auth.token", () => {
    const socket = makeSocket({ auth: { token: sign() } });

    socketAuthMiddleware(socket as any, next);

    expect(socket.data.userId).toBe(userId);
    expect(next).toHaveBeenCalledWith();
  });

  it("authenticates using a Bearer Authorization header", () => {
    const socket = makeSocket({ headers: { authorization: `Bearer ${sign()}` } });

    socketAuthMiddleware(socket as any, next);

    expect(socket.data.userId).toBe(userId);
    expect(next).toHaveBeenCalledWith();
  });

  it("authenticates using the accessToken cookie", () => {
    const socket = makeSocket({
      headers: { cookie: `other=value; accessToken=${sign()}` },
    });

    socketAuthMiddleware(socket as any, next);

    expect(socket.data.userId).toBe(userId);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a connection with no token", () => {
    const socket = makeSocket();

    socketAuthMiddleware(socket as any, next);

    expect(socket.data.userId).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("rejects an invalid or expired token", () => {
    const socket = makeSocket({ auth: { token: "not-a-real-token" } });

    socketAuthMiddleware(socket as any, next);

    expect(socket.data.userId).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

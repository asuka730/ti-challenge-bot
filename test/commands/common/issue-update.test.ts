import nock from "nock";
import myProbotApp from "../../../src";
import { Probot } from "probot";
import {
  createOrUpdateNotificationBody,
  createOrUpdateStatusBody,
} from "../../../src/commands/common/issue-update";

import typeorm = require("typeorm");
const fs = require("fs");
const path = require("path");

describe("Issue Update", () => {
  let probot: any;
  let mockCert: string;

  beforeAll((done: Function) => {
    fs.readFile(
      path.join(__dirname, "../../fixtures/mock-cert.pem"),
      (err: Error, cert: string) => {
        if (err) return done(err);
        mockCert = cert;
        done();
      }
    );
  });

  beforeEach(() => {
    // @ts-ignore
    typeorm.createConnection = jest.fn().mockResolvedValue(null);
    nock.disableNetConnect();
    probot = new Probot({ id: 123, cert: mockCert });
    // Load our app into probot
    probot.load(myProbotApp);

    nock("https://api.github.com")
      .post("/app/installations/2/access_tokens")
      .reply(200, {
        token: "test",
        permissions: {
          issues: "write",
        },
      });
  });

  test("createOrUpdateNotificationBody function test", () => {
    const case1: [string, string, string, string][] = [
      [
        "this is a message",
        `
        tidb
        tikv
`,
        "asuka730",
        `
        tidb
        tikv



## :warning:Notification:warning:

@asuka730 this is a message<!-- probot:Notification -->

`,
      ],
    ];
    const case2: [string, string, undefined, string][] = [
      [
        "this is a message",
        `
        tidb
        tikv
`,
        undefined,
        `
        tidb
        tikv



## :warning:Notification:warning:

this is a message<!-- probot:Notification -->

`,
      ],
    ];

    case1.forEach((c) => {
      expect(createOrUpdateNotificationBody(c[0], c[1], c[2])).toBe(c[3]);
    });
    case2.forEach((c) => {
      expect(createOrUpdateNotificationBody(c[0], c[1], c[2])).toBe(c[3]);
    });
  });

  test("createOrUpdateStatusBody function test", () => {
    const case1: [string, string, string, string][] = [
      [
        `
        tidb
        tikv
`,
        "asuka730",
        "chanllenge1",
        `
        tidb
        tikv



## Status

Current challenger: @asuka730
Current Program: chanllenge1
<!-- probot:Status -->

`,
      ],
    ];

    const case2: [string, string, undefined, string][] = [
      [
        `
        tidb
        tikv
`,
        "asuka730",
        undefined,
        `
        tidb
        tikv



## Status

Current challenger: @asuka730
<!-- probot:Status -->

`,
      ],
    ];
    const case3: [string, undefined, undefined, string][] = [
      [
        `
        tidb
        tikv
`,
        undefined,
        undefined,
        `
        tidb
        tikv



## Status

The challenge has not picked yet.
<!-- probot:Status -->

`,
      ],
    ];

    case1.forEach((c) => {
      expect(createOrUpdateStatusBody(c[0], c[1], c[2])).toBe(c[3]);
    });
    case2.forEach((c) => {
      expect(createOrUpdateStatusBody(c[0], c[1], c[2])).toBe(c[3]);
    });
    case3.forEach((c) => {
      expect(createOrUpdateStatusBody(c[0], c[1], c[2])).toBe(c[3]);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

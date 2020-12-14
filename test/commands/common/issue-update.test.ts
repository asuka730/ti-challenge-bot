import nock from "nock";
import myProbotApp from "../../../src";
import { Probot } from "probot";
import {
  combineIssueContentWithNotification,
  combineIssueContentWithStatus,
} from "../../../src/commands/common/issue-update";
import {
  IChallengeIssueService,
  IChallengeIssueServiceToken,
} from "../../../src/services/challenge-issue";
import Container, { Service } from "typedi";

import typeorm = require("typeorm");
const fs = require("fs");
const path = require("path");

describe("Issue Update", () => {
  let probot: any;
  let mockCert: string;

  const mockGiveUpMethod = jest.fn();
  const mockPickUpMethod = jest.fn();

  beforeAll((done: Function) => {
    fs.readFile(
      path.join(__dirname, "../../fixtures/mock-cert.pem"),
      (err: Error, cert: string) => {
        if (err) return done(err);
        mockCert = cert;
        done();
      }
    );

    // Mock the challenge-issue service.
    @Service(IChallengeIssueServiceToken)
    // TODO: remove the experimentalDecorators warning.
    class MockChallengeIssueService implements IChallengeIssueService {
      giveUp = mockGiveUpMethod.mockResolvedValue(undefined);
      createWhenIssueOpened = jest.fn().mockResolvedValue(undefined);
      updateWhenIssueEdited = jest.fn().mockResolvedValue(undefined);
      removeWhenIssueUnlabeled = jest.fn().mockResolvedValue(undefined);
      pickUp = mockPickUpMethod.mockResolvedValue(undefined);
    }

    Container.set(IChallengeIssueServiceToken, new MockChallengeIssueService());

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

  test("combineIssueContentWithNotification function test", () => {
    const normalCase: [string, string, string, string][] = [
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
    const caseWithoutSender: [string, string, undefined, string][] = [
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

    normalCase.forEach((c) => {
      expect(combineIssueContentWithNotification(c[0], c[1], c[2])).toBe(c[3]);
    });
    caseWithoutSender.forEach((c) => {
      expect(combineIssueContentWithNotification(c[0], c[1], c[2])).toBe(c[3]);
    });
  });

  test("combineIssueContentWithStatus function test", () => {
    const normalCase: [string, string, string, string][] = [
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

    const CaseWithoutProgram: [string, string, undefined, string][] = [
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
    const CaseWithoutChallengeAndProgram: [
      string,
      undefined,
      undefined,
      string
    ][] = [
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

    normalCase.forEach((c) => {
      expect(combineIssueContentWithStatus(c[0], c[1], c[2])).toBe(c[3]);
    });
    CaseWithoutProgram.forEach((c) => {
      expect(combineIssueContentWithStatus(c[0], c[1], c[2])).toBe(c[3]);
    });
    CaseWithoutChallengeAndProgram.forEach((c) => {
      expect(combineIssueContentWithStatus(c[0], c[1], c[2])).toBe(c[3]);
    });
  });

  jest.mock("../../../src/services/challenge-issue/index");



  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});

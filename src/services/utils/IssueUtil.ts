import { LabelQuery } from "../../queries/LabelQuery";
import { Context } from "probot";

import { IssueQuery } from "../../queries/IssueQuery";
import { IssueOrPullStatus } from "../../repositoies/score";
import {
  CHALLENGE_PROGRAM_LABEL,
  HELP_WANTED_LABEL,
} from "../../commands/labels";
import { UserQuery } from "../../queries/UserQuery";

const MENTOR_REGEX = /(Mentor).*[\r\n]+[-|* ]*[@]*([a-z0-9](?:-?[a-z0-9]){0,38})/i;
const SCORE_REGEX = /(Score).*[\r\n]+[-|* ]*([1-9]+[0-9]*)/;
const STATUS_REGEX = /(Status).*[\r\n]+([\d\D]*)(?=<!-- probot:Status -->)[\r\n]*[\d\D]*/i;
const NOTIFICATION_REGEX = /(:warning:Notification:warning:).*[\r\n]+([\d\D]*)(?=<!-- probot:Notification -->)[\r\n]*[\d\D]*/i;
export enum IssueNotificationHead {
  STATUS = `


## Status

xxx<!-- probot:Status -->

`,

  NOTIFICATION = `


## :warning:Notification:warning:

xxx<!-- probot:Notification -->

`,
}

export interface MentorAndScore {
  mentor: string;
  score: number;
}

export function findMentorAndScore(
  issueBody: string
): MentorAndScore | undefined {
  const mentorData = issueBody.match(MENTOR_REGEX);
  if (mentorData?.length !== 3) {
    return undefined;
  }

  const scoreData = issueBody.match(SCORE_REGEX);
  if (scoreData?.length !== 3) {
    return undefined;
  }

  return {
    mentor: mentorData[2].replace("@", "").trim(),
    score: Number(scoreData[2]),
  };
}

export function findSigLabel(labels: LabelQuery[]): LabelQuery | undefined {
  return labels.find((l: LabelQuery) => {
    return l.name.startsWith("sig/");
  });
}

export function isChallengeIssue(labels: LabelQuery[]): boolean {
  const challengeLabel = labels.filter((l: LabelQuery) => {
    return l.name === CHALLENGE_PROGRAM_LABEL;
  });
  return challengeLabel.length > 0;
}

export function needHelp(labels: LabelQuery[]): boolean {
  return labels
    .map((l) => {
      return l.name;
    })
    .includes(HELP_WANTED_LABEL);
}

export function isClosed(issue: IssueQuery): boolean {
  return issue.state === IssueOrPullStatus.Closed;
}

export function checkIsInAssignFlow(
  assignees: UserQuery[],
  mentor: string
): boolean {
  let hasMentor = false;

  assignees.forEach((a) => {
    if (a.login === mentor) {
      hasMentor = true;
    }
  });

  return hasMentor;
}

export function updateNotification(
  message: string,
  issueBody: string,
  sender?: string
): string {
  const reg = /## :warning:Notification:warning:/i;
  if (!reg.test(issueBody)) {
    issueBody = issueBody + IssueNotificationHead.NOTIFICATION;
  }
  let newMessage: string = message;
  if (sender !== undefined) {
    newMessage = "@" + sender + " " + message;
  }

  const notificationData = issueBody.match(NOTIFICATION_REGEX); //new notification
  if (notificationData?.length !== 3) {
    return issueBody;
  }

  const newIssuebody = issueBody.replace(notificationData[2], newMessage); //update message
  return newIssuebody;
}

export function updateStatus(
  issueBody: string,
  challenger?: string,
  program?: string
): string {
  const reg = /## Status/i;
  if (!reg.test(issueBody)) {
    issueBody = issueBody + IssueNotificationHead.STATUS;
  }

  let newMessage: string;

  if (program === undefined && challenger === undefined) {
    newMessage = `&nbsp;&nbsp; The challenge has not picked yet.
`;
  } else if (program == undefined) {
    newMessage = `&nbsp;&nbsp;Current challenger: @${challenger}
`;
  } else {
    newMessage = `&nbsp;&nbsp;Current challenger: @${challenger}
&nbsp;&nbsp;Current Program: ${program}
`;
  }

  const StatusData = issueBody.match(STATUS_REGEX); //new notification
  if (StatusData?.length !== 3) {
    return issueBody;
  }

  const newIssuebody = issueBody.replace(StatusData[2], newMessage); //update message
  return newIssuebody;
}

export async function createOrUpdateNotification(
  context: Context,
  message: string,
  sender?: string
) {
  const issueContext = context.issue();
  const issueResponse = await context.github.issues.get(issueContext);
  const issueBody = issueResponse.data.body;
  const newIssuebody = updateNotification(message, issueBody, sender);
  await context.github.issues.update({
    ...issueContext,
    body: newIssuebody,
  });
}

export async function createOrUpdateStatus(
  context: Context,
  sender?: string,
  program?: string
) {
  const issueResponse = await context.github.issues.get(context.issue());
  const issueBody = issueResponse.data.body;
  const newIssuebody = updateStatus(issueBody, sender, program);
  await context.github.issues.update({
    ...context.issue(),
    body: newIssuebody,
  });
}

// functions/approval_function.ts
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const ApprovalFunction = DefineFunction({
  callback_id: "approval",
  title: "Approval",
  description: "Get approval for a request",
  source_file: "functions/approval.ts",
  input_parameters: {
    properties: {
      dtest: {
        type: "slack#/types/date",
      },
      requester_id: {
        type: Schema.slack.types.user_id,
        description: "Requester",
      },
      approval_channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Approval channel",
      },
      subject: {
        type: Schema.types.string,
        description: "Subject",
      },
      details: {
        type: Schema.types.string,
        description: "Details Updated",
      },
    },
    required: [
      "requester_id",
      "approval_channel_id",
      "subject",
      "details",
    ],
  },
  output_parameters: {
    properties: {
      approved: {
        type: Schema.types.boolean,
        description: "Approved",
      },
      comments: {
        type: Schema.types.string,
        description: "Comments",
      },
      reviewer: {
        type: Schema.slack.types.user_id,
        description: "Reviewer",
      },
    },
    required: ["approved", "reviewer"],
  },
});

export default SlackFunction(ApprovalFunction, async ({ inputs, client }) => {
  console.log("Incoming approval!");
  const response = await client.chat.postMessage({
    channel: inputs.approval_channel_id,
    blocks: [{
      "type": "actions",
      "block_id": "my-buttons",
      "elements": [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve" },
          action_id: "approve_request",
          style: "primary",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Deny" },
          action_id: "deny_request",
          style: "danger",
        },
      ],
    }],
  });
  if (response.error) {
    const error = `Failed to post a message with buttons! - ${response.error}`;
    return { error };
  }
  // Important to set completed: false! We will set the function's complete
  // status later - in our action handler
  return { completed: false };
}).addBlockActionsHandler(
  ["approve_request", "deny_request"], // The first argument to addBlockActionsHandler can accept an array of action_id strings.
  async ({ body, action, inputs, client }) => { // The second argument is the handler function itself
    console.log("Incoming action handler invocation", action);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    console.log("waiting");
    await sleep(5000);
    console.log("done waiting");
    const outputs = {
      reviewer: inputs.requester_id,
      // Based on which button was pressed - determined via action_id - we can
      // determine whether the request was approved or not.
      approved: action.action_id === "approve_request",
    };
    // And now we can mark the function as 'completed' - which is required as
    // we explicitly marked it as incomplete in the main function handler.
    const completion = await client.functions.completeSuccess({
      function_execution_id: body.function_data.execution_id,
      outputs,
    });
    if (completion.error) {
      const error = `Failed to complete a function - ${completion.error}`;
      return { error };
    }
  },
);

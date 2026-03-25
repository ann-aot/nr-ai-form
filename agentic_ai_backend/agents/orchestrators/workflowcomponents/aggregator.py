from agent_framework import Executor, WorkflowContext, handler
from typing import Any
import os
from openai import AsyncAzureOpenAI

class Aggregator(Executor):
    """Aggregate the results from the different tasks and yield the final output."""

    @handler
    async def handle(self, results: list[Any], ctx: WorkflowContext):
        """Receive the results from the source executors.

        The framework will automatically collect messages from the source executors
        and deliver them as a list.

        Args:
            results (list[Any]): execution results from upstream executors.
                The type annotation must be a list of union types that the upstream
                executors will produce.
            ctx (WorkflowContext[Never, list[Any]]): A workflow context that can yield the final output.
        """
        
        # Check if we have OpenAI config
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        deployment = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME")
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2023-05-15")

        if api_key and endpoint and deployment:
            try:
                client = AsyncAzureOpenAI(
                    api_key=api_key,
                    api_version=api_version,
                    azure_endpoint=endpoint
                )
                
                # Extract information from results
                conversation_text = ""
                form_text = ""
                form_step = ""
                
                for res in results:
                    if isinstance(res, dict):
                        source = res.get("source", "")
                        if "Conversation" in source:
                            conversation_text = res.get("response", "")
                            print("Conversation Text: ", conversation_text)
                        elif "FormSupport" in source:
                            form_text = res.get("response", "")
                            print("Form Text: ", form_text)
                            form_step = res.get("step_number", "")
                
               
                system_prompt = (
                    "You are a friendly assistant helping people fill out the BC Water Permit Application. "
                )
                
                #TODO: ABIN, need to pull from Blob Store for more flexible prompts??? 
                user_prompt = f"""
                You have received information from two sub agents:
                
                1. Conversation Agent (General Info comes from Azure AI Search): 
                {conversation_text}
                
                2. Form Support Agent (Form Specific Info for step '{form_step}'): 
                {form_text}
                
                ## Tone & Length Rules
                - Use simple, plain, everyday language. Avoid formal or technical jargon unless necessary.
                - Never use bureaucratic or overly formal phrasing. Write like a helpful person, not a government document.

                ## Response Routing Rules (apply in order, use the FIRST matching rule)

                **Rule 1 — Field or Page/Section Inquiry:**
                If the Form Support Agent returned:
                - A JSON object with `type` equal to `"form"` (page/section context query), OR
                - A JSON object or array where `suggestedvalue` is an empty string `""` (field inquiry), OR
                - The user's query is clearly asking about what a field, page, or section is (e.g. "what is this?", "what does this field mean?", "what is this page for?", "what do I do here?", "can you explain this section?", "what are the rest of the fields?", "what are these questions?")

                Then: Summarize ONLY from the Form Support Agent response. Use the `formdescription` or `description` values to explain in plain language. Do NOT include anything from the Conversation Agent. Do NOT add extra context, fees, or background information the user did not ask for.

                **Rule 2 — Form Action (user provided context to fill a field):**
                If the Form Support Agent returned JSON with non-empty `suggestedvalue` fields:

                Then: Focus the response on what was selected/filled. Only add Conversation Agent context if it directly supports the action taken. Do NOT pad the response with unrelated general information.

                **Rule 3 — Application-Related Query (general question about the process):**
                If the user is asking a broad question about the application process, eligibility rules, requirements, or procedures:

                Then: Synthesize from BOTH agents. Lead with the Conversation Agent's response, then add relevant context from the Form Support Agent if available, if the form support agent returned "No Match", then omit it, no need to include it in the response.

                **Strict — Stay on topic**: Only answer what the user actually asked. Do NOT volunteer extra information about fees, procedures, or background context unless the user specifically asked about those things.

                ## General Rules (apply to all responses)
                - Do not mention "Conversation Agent" or "Form Support Agent" by name. Speak as a single entity ("I" or "we").
                - Do not send a JSON in the aggregated response.
                - On step 3 - Technical Information, if there are any calculations involved, DO NOT use LATEX. Write it out as plain text.
                - *Strict — No partial apologies*: NEVER say things like "I don't have specific information about X, but..." or "I couldn't find details on that, however...". If at least one agent has a useful response, summarize only that — do not mention what the other agent didn't know.
                - *Strict — Fallback only when both agents have nothing*: Only respond with "I wasn't able to find specific information on that. Please contact the BC Water Permit office for further assistance." if BOTH agents returned "Not found", "No Match", or an empty/unhelpful response.
                - If only one agent has a useful response, summarize from that agent alone — cleanly and confidently, with no caveats about the other agent.
                - *Strict — ALWAYS acknowledge suggestedvalue*: If the Form Support Agent JSON contains any field with a non-empty `suggestedvalue`, you MUST tell the user what was selected or filled in. NEVER skip this. For every such field, include a statement like: I have selected **"<suggestedvalue>"** for you. Use bold markdown to highlight the value. If there are multiple fields, list each one.
                  - `type` is "button": guide the user to click it, e.g. "I have selected **"Apply without BCeID"** for you — please click the button to proceed."
                  - `type` is "radio" or "select": say "I have selected **"<suggestedvalue>"** for you."
                  - `type` is "string" or "textarea": say "I have filled in **"<suggestedvalue>"** for you."
                  - `type` is "number": say "I have entered **"<suggestedvalue>"** for you."
                - If `suggestedvalue` is empty (`""`), do NOT mention that field at all — no action was taken for it.
                - If the Form Support Agent says "No Match" AND the user's query appears to be a vague form action request (e.g. "select a radio button", "fill in the field", "click something", "select an option") without specifying which field or what value — respond by asking the user to clarify. Tell them to include the field name and the value in their question so you can help. Example: "Please include the field name and value and ask the question again, so I can help you."
                - Note: You only have access to the current turn's responses from both agents. You do NOT have access to previous conversation history — base your response only on what is provided above. Each message is a fresh turn, so always answer based on the current input only.
                """
                
                completion = await client.chat.completions.create(
                    model=deployment,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],                   
                )
                
                final_text = completion.choices[0].message.content
                
                
                aggregated_result = {
                    "source": "Aggregator",
                    "response": final_text,
                    "original_results": results 
                }

                print("Aggregated Result: ", aggregated_result)
                
                
                await ctx.yield_output([aggregated_result])
                return

            except Exception as e:
                print(f"Error in Aggregator LLM call: {e}")
                # Fallback to returning original results if LLM fails/errors
        else:
            print("Aggregator: Missing Azure OpenAI credentials (API_KEY, ENDPOINT, or DEPLOYMENT). Returning raw results.")
        
        print("Aggregator: Yielding raw results.")
        await ctx.yield_output(results)
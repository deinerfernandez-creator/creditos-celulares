'use server';
/**
 * @fileOverview An AI tool to summarize a customer's credit status.
 *
 * - summarizeCreditStatus - A function that generates a concise summary of a customer's credit status.
 * - SummarizeCreditStatusInput - The input type for the summarizeCreditStatus function.
 * - SummarizeCreditStatusOutput - The return type for the summarizeCreditStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeCreditStatusInputSchema = z.object({
  customerName: z.string().describe("The name of the customer."),
  loanAmount: z.number().describe("The initial loan amount."),
  totalAmountDue: z.number().describe("The total amount the customer is expected to pay, including interest/recargo."),
  remainingBalance: z.number().describe("The current outstanding balance of the credit."),
  nextPaymentDate: z.string().describe("The date of the next scheduled payment in 'YYYY-MM-DD' format."),
  paymentFrequency: z.string().describe("The frequency of payments (e.g., 'quincenal', 'mensual')."),
  paymentHistory: z.array(
    z.object({
      date: z.string().describe("The date of the payment in 'YYYY-MM-DD' format."),
      amount: z.number().describe("The amount paid."),
    })
  ).describe("A list of historical payments made by the customer."),
});
export type SummarizeCreditStatusInput = z.infer<typeof SummarizeCreditStatusInputSchema>;

const SummarizeCreditStatusOutputSchema = z.string().describe("A concise summary of the customer's credit status.");
export type SummarizeCreditStatusOutput = z.infer<typeof SummarizeCreditStatusOutputSchema>;

export async function summarizeCreditStatus(input: SummarizeCreditStatusInput): Promise<SummarizeCreditStatusOutput> {
  return summarizeCreditStatusFlow(input);
}

const summarizeCreditStatusPrompt = ai.definePrompt({
  name: 'summarizeCreditStatusPrompt',
  input: {schema: SummarizeCreditStatusInputSchema},
  output: {schema: SummarizeCreditStatusOutputSchema},
  prompt: `Eres un asistente de IA especializado en análisis de crédito para 'Tecnicell Créditos'. Genera un resumen conciso del estado crediticio del cliente proporcionado. Mantén la respuesta profesional y enfocada en los puntos clave.

**Detalles del Cliente:**
Nombre: {{{customerName}}}
Monto Inicial del Préstamo: $${{loanAmount}}
Monto Total a Pagar: $${{totalAmountDue}}
Saldo Restante: $${{remainingBalance}}
Próxima Fecha de Pago: {{{nextPaymentDate}}}
Frecuencia de Pago: {{{paymentFrequency}}}

**Historial de Pagos:**
{{#if paymentHistory}}
  {{#each paymentHistory}}
    - Fecha: {{{date}}}, Cantidad: $${{amount}}
  {{/each}}
{{else}}
  No hay historial de pagos registrado.
{{/if}}

Basándote en la información anterior, genera un resumen que incluya:
1.  El nombre completo del cliente.
2.  El saldo restante actual del crédito.
3.  La próxima fecha de pago programada.
4.  Una breve análisis de la consistencia de pagos históricos (ej., 'pagos consistentes y puntuales', 'algunos pagos tardíos o incompletos', 'historial de pagos irregular', 'no hay historial de pagos', etc.) y cualquier observación relevante sobre el comportamiento de pago.

El resumen debe ser una frase o párrafo corto, directo y profesional, ideal para un agente de servicio al cliente. No uses un formato de lista para el resultado final, solo el resumen unificado.`,
});

const summarizeCreditStatusFlow = ai.defineFlow(
  {
    name: 'summarizeCreditStatusFlow',
    inputSchema: SummarizeCreditStatusInputSchema,
    outputSchema: SummarizeCreditStatusOutputSchema,
  },
  async (input) => {
    const {output} = await summarizeCreditStatusPrompt(input);
    return output!;
  }
);

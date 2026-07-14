import type { ComponentType } from "react";
import { template as newEnquiryTemplate } from "./new-enquiry";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string;
  displayName: string;
  previewData?: Record<string, unknown>;
}

export interface TemplateRegistry {
  [name: string]: TemplateEntry;
}

export const TEMPLATES: TemplateRegistry = {
  "new-enquiry": newEnquiryTemplate,
};

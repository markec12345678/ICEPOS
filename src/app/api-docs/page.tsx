"use client";
import { openApiSpec } from "@/lib/openapi-spec";
import dynamic from "next/dynamic";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI spec={openApiSpec as any} />
    </div>
  );
}

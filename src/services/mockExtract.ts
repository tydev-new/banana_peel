export type MockExtractElement = {
  id: string;
  png: string;
  bbox: { x: number; y: number; w: number; h: number };
};

export type MockExtractResponse = {
  backgroundPng: string;
  elements: MockExtractElement[];
};

export async function mockExtract(img: Blob): Promise<MockExtractResponse> {
  const base64 = await blobToBase64(img);

  return {
    backgroundPng: base64,
    elements: [
      {
        id: "elem-01",
        png: base64,
        bbox: { x: 20, y: 20, w: 200, h: 200 },
      },
    ],
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, encoded = ""] = result.split(",");
      resolve(encoded);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read blob"));
    };

    reader.readAsDataURL(blob);
  });
}

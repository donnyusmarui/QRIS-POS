export interface ProductChatConfig {
  buttonText: string
  enabled: boolean
  customPrompt: string
}

export const DEFAULT_PRODUCT_CHAT_CONFIG: ProductChatConfig = {
  buttonText: "Tanya Apoteker",
  enabled: true,
  customPrompt: "",
}

/**
 * Extracts clean description and structured chat configuration from a product description string.
 * Uses a safe HTML-comment wrapper <!--chat:{...}--> to remain 100% DB schema backward-compatible.
 */
export function parseProductChatConfig(description?: string | null): {
  cleanDescription: string
  chatConfig: ProductChatConfig
} {
  if (!description) {
    return { cleanDescription: "", chatConfig: { ...DEFAULT_PRODUCT_CHAT_CONFIG } }
  }

  const match = description.match(/<!--chat:([\s\S]*?)-->/)
  if (!match) {
    return {
      cleanDescription: description.trim(),
      chatConfig: { ...DEFAULT_PRODUCT_CHAT_CONFIG },
    }
  }

  try {
    const parsed = JSON.parse(match[1])
    return {
      cleanDescription: description.replace(/<!--chat:[\s\S]*?-->/g, "").trim(),
      chatConfig: {
        buttonText: (parsed.buttonText || DEFAULT_PRODUCT_CHAT_CONFIG.buttonText).trim(),
        enabled: parsed.enabled !== false,
        customPrompt: (parsed.customPrompt || "").trim(),
      },
    }
  } catch {
    return {
      cleanDescription: description.replace(/<!--chat:[\s\S]*?-->/g, "").trim(),
      chatConfig: { ...DEFAULT_PRODUCT_CHAT_CONFIG },
    }
  }
}

/**
 * Serializes base medical description and chat config into a single string with embedded comment metadata.
 */
export function serializeProductDescription(
  cleanDescription: string,
  chatConfig?: Partial<ProductChatConfig>
): string {
  const base = cleanDescription.replace(/<!--chat:[\s\S]*?-->/g, "").trim()
  if (!chatConfig) return base

  const cfg: ProductChatConfig = {
    buttonText: (chatConfig.buttonText || DEFAULT_PRODUCT_CHAT_CONFIG.buttonText).trim(),
    enabled: chatConfig.enabled !== false,
    customPrompt: (chatConfig.customPrompt || "").trim(),
  }

  // Only embed metadata if custom settings differ from defaults
  const isDefault =
    cfg.buttonText === DEFAULT_PRODUCT_CHAT_CONFIG.buttonText &&
    cfg.enabled === DEFAULT_PRODUCT_CHAT_CONFIG.enabled &&
    !cfg.customPrompt

  if (isDefault) return base

  return `${base}\n<!--chat:${JSON.stringify(cfg)}-->`.trim()
}

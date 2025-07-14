export const replaceTemplatePlaceholders = (template, data) => {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(placeholder, value || '');
    }
    return result;
  };
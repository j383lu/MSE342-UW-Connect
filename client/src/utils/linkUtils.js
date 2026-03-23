// utils/linkUtils.js
export const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
        urlRegex.test(part) ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer"
               style={{ color: '#1976d2', wordBreak: 'break-all' }}>
                {part}
            </a>
        ) : part
    );
};
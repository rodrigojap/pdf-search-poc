using System.Text;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace PdfSearch.Api.Services;

public class PdfTextExtractorService
{
    private readonly ILogger<PdfTextExtractorService> _logger;

    public PdfTextExtractorService(ILogger<PdfTextExtractorService> logger)
    {
        _logger = logger;
    }

    public string Extract(Stream pdfStream)
    {
        var sb = new StringBuilder();

        using var document = PdfDocument.Open(pdfStream);

        _logger.LogInformation("Extracting text from PDF with {PageCount} page(s).", document.NumberOfPages);

        foreach (var page in document.GetPages())
        {
            foreach (Word word in page.GetWords())
            {
                sb.Append(word.Text).Append(' ');
            }
            sb.AppendLine();
        }

        var result = sb.ToString().Trim();
        _logger.LogInformation("Extracted {CharCount} characters.", result.Length);
        return result;
    }
}

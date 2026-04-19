using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.Core.Search;
using Elastic.Clients.Elasticsearch.QueryDsl;
using PdfSearch.Api.Models;

namespace PdfSearch.Api.Services;

public class ElasticsearchIndexService
{
    private const string IndexName = "pdfs";

    private readonly ElasticsearchClient _client;
    private readonly ILogger<ElasticsearchIndexService> _logger;

    public ElasticsearchIndexService(ElasticsearchClient client, ILogger<ElasticsearchIndexService> logger)
    {
        _client = client;
        _logger = logger;
    }

    public async Task EnsureIndexExistsAsync()
    {
        var existsResponse = await _client.Indices.ExistsAsync(IndexName);

        // 8.13.0: ExistsResponse has no Exists property (restored in 8.13.4+). HEAD /index returns 200 iff present.
        if (existsResponse.IsValidResponse)
        {
            _logger.LogInformation("Index '{Index}' already exists.", IndexName);
            return;
        }

        // Dynamic mapping is sufficient for a POC; ES infers text/keyword/date automatically.
        var createResponse = await _client.Indices.CreateAsync(IndexName, c => c
            .Settings(s => s
                .NumberOfShards(1)
                .NumberOfReplicas(0)
            )
        );

        if (createResponse.IsValidResponse)
            _logger.LogInformation("Index '{Index}' created.", IndexName);
        else
            _logger.LogError("Failed to create index: {Error}", createResponse.ElasticsearchServerError?.ToString());
    }

    public async Task IndexDocumentAsync(PdfDocument document)
    {
        var response = await _client.IndexAsync(document, IndexName, i => i.Id(document.Id));

        if (!response.IsValidResponse)
            throw new InvalidOperationException($"Failed to index document: {response.ElasticsearchServerError}");

        _logger.LogInformation("Indexed document id={Id} file={File}", document.Id, document.FileName);
    }

    public async Task<IReadOnlyList<SearchResult>> SearchAsync(string term)
    {
        var response = await _client.SearchAsync<PdfDocument>(s => s
            .Index(IndexName)
            .Size(20)
            .Query(q => q
                .MultiMatch(m => m
                    .Query(term)
                    .Fields(new[] { "content", "fileName" })
                    .Type(TextQueryType.BestFields)
                    .Fuzziness(new Fuzziness("AUTO"))
                )
            )
            .Highlight(h => h
                .PreTags(["<em>"])
                .PostTags(["</em>"])
                .Fields(f => f
                    .Add("content", hf => hf
                        .NumberOfFragments(3)
                        .FragmentSize(150)))
            )
        );

        if (!response.IsValidResponse)
            throw new InvalidOperationException($"Search failed: {response.ElasticsearchServerError}");

        _logger.LogInformation("Search for '{Term}' returned {Count} hits.", term, response.Hits.Count);

        return response.Hits
            .Select(hit =>
            {
                var snippet = ResolveSnippet(hit);
                return new SearchResult
                {
                    FileName = hit.Source?.FileName ?? string.Empty,
                    Path = hit.Source?.Path ?? string.Empty,
                    Content = snippet
                };
            })
            .ToList();
    }

    private static string ResolveSnippet(Hit<PdfDocument> hit)
    {
        if (hit.Highlight?.TryGetValue("content", out var fragments) == true && fragments.Count > 0)
            return string.Join(" ... ", fragments);

        var raw = hit.Source?.Content ?? string.Empty;
        return raw.Length > 300 ? raw[..300] + "..." : raw;
    }
}

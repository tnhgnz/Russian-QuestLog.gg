using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;

var path = Path.GetFullPath(
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "itemsdb.json"));

if (!File.Exists(path))
{
    Console.Error.WriteLine("itemsdb.json not found at: " + path);
    return 1;
}

var root = JsonNode.Parse(await File.ReadAllTextAsync(path))!;
var removed = 0;
Walk(root, ref removed);

var backup = path + ".bak_strip_armor_" + DateTime.Now.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
File.Copy(path, backup, overwrite: false);

var opts = new JsonSerializerOptions { WriteIndented = true, IndentCharacter = ' ', IndentSize = 4 };
await File.WriteAllTextAsync(path, root.ToJsonString(opts));

Console.WriteLine("Backup: " + backup);
Console.WriteLine("Removed armorCategory from " + removed + " objects.");
return 0;

static void Walk(JsonNode? n, ref int removed)
{
    switch (n)
    {
        case JsonObject o:
            if (o.Remove("armorCategory"))
                removed++;
            foreach (var kv in o.ToList())
                Walk(kv.Value, ref removed);
            break;
        case JsonArray a:
            foreach (var item in a)
                Walk(item, ref removed);
            break;
    }
}

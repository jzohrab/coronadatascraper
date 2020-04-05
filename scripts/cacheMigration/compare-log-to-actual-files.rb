# Given cacheCalls.txt in this directory, compare the output against the data.


require 'json'

# The cacheCalls file isn't actually valid json: we have to strip off
# a final comma, and put everything in [ ].
# Totally lazy hack.
def get_cachecalls_json()
  raw_content = File.read(File.join(__dir__, 'cacheCalls.txt'))
  actual = "[ #{raw_content} ]".gsub(",\n ]", "\n]")
  return JSON.parse(actual)
end

# Remove cruft from the cacheCalls data.
def clean_output(hsh)
  ret = hsh.clone
  ret['scraperPath'].gsub!(/^.*?src/, 'src')
  ret.delete('cacheFileExists')
  return ret
end


j = get_cachecalls_json()

jout =
  j.select { |h| h['cacheFilePath'] =~ /coronadatascraper-cache/ }.
    map { |h| clean_output(h) }
         

puts JSON.pretty_generate(jout)

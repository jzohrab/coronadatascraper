# Hack all of the scraper files


LOCATION_RE = /(\s*)(city|county|state|country):/
METHODS = 'page|json|csv|tsv|pdf|headless|getArcGISCSVURLFromOrgId|getArcGISCSVURL'

# The fancy RE below splits a line like "await fetch.csv(this.url)"
# into ["await fetch.csv(this.url)", "await fetch.csv(", "this.url)"]
FETCH_RE = /((await\s+.*?\.(?:#{METHODS})\s*\()(.*\)))/

# Skip some files.
# Not bothering to try to determine these programmatically.
IGNORE_FILES = %w(
AUS/_shared/get-data-with-tested-negative-applied.js
AUS/_shared/get-key.js
)


# Print warnings only for each file f in scraper_dir.
def validate(scraper_dir, f)
  fpath = File.join(scraper_dir, f)
  src = File.read(fpath)
  [ LOCATION_RE, FETCH_RE ].each do |re|
    puts "WARN: No match for #{re} in #{f}" if (src !~ re)
  end
end


def add_filename_to_scraper_this(src)
  m = src.match(LOCATION_RE)
  spaces = m[1].gsub("\n", '')
  loctype = m[2]
  puts "  adding filepath above #{loctype}"
  add_code = "
#{spaces}_filepath: __filename,
#{spaces}#{loctype}:"
  src = src.sub(LOCATION_RE, add_code)
  src
end

def add_this_to_fetch_calls(src)
  matches = src.scan(FETCH_RE)
  matches.each do |m|
    raise "bad re? #{m}" if m.size != 3
    wholeline, before, after = m
    newline = "#{before}this, #{after}"
    puts "  \"#{wholeline}\" => \"#{newline}\""
    src = src.gsub(wholeline, newline)
  end
  src
end


########################################

scraper_dir = File.join(__dir__, '..', '..', 'src', 'shared', 'scrapers')

files = []
Dir.chdir(scraper_dir) do
  files = Dir.glob(File.join('**', '*.js'))
end
# puts "Pre remove count: #{files.count}"
files -= IGNORE_FILES
# puts "Post remove count: #{files.count}"
puts "#{files.size} scraper files."

puts "VALIDATION ========================================"
files.each do |f|
  validate(scraper_dir, f)
end
puts "END VALIDATION ===================================="


# During dev, just do one file.
# add_filename_to_scraper_this(scraper_dir, files[0])
files = [files[0]]

puts "MUTATION ========================================"
files.each do |f|
  puts '-' * 20
  puts f
  fpath = File.join(scraper_dir, f)
  src = File.read(fpath)
  src = add_filename_to_scraper_this(src)
  src = add_this_to_fetch_calls(src)

  puts src
end
puts "END MUTATION ===================================="

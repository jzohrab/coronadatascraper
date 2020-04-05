# Hack all of the scraper files


$locationRE = /(\s*)(city|county|state|country):/

def validate(scraper_dir, f)
  fpath = File.join(scraper_dir, f)
  src = File.read(fpath)

  if (src !~ $locationRE)
    raise "No match for #{locationRE} in #{f}"
  end
end


def add_filename_to_scraper_this(scraper_dir, f)
  fpath = File.join(scraper_dir, f)
  src = File.read(fpath)

  puts f
  m = src.match($locationRE)
  puts m.inspect

  spaces = m[1].gsub("\n", '')
  loctype = m[2]

  add_code = "
#{spaces}_filepath: __filename,
#{spaces}#{loctype}:"

  src = src.sub($locationRE, add_code)
  puts src
end


########################################

scraper_dir = File.join(__dir__, '..', '..', 'src', 'shared', 'scrapers')

files = []
Dir.chdir(scraper_dir) do
  files = Dir.glob(File.join('**', '*.js'))
end

puts "#{files.size} scraper files."

# During dev, just do one file.
add_filename_to_scraper_this(scraper_dir, files[0])

use framework "Vision"

on getImageText(imagePath)
    -- Get image content
    set theImage to current application's NSImage's alloc()'s initWithContentsOfFile:imagePath

    -- Set up request handler using image's raw data
    set requestHandler to current application's VNImageRequestHandler's alloc()'s initWithData:(theImage's TIFFRepresentation()) options:(current application's NSDictionary's alloc()'s init())

    -- Initialize text request
    set theRequest to current application's VNRecognizeTextRequest's alloc()'s init()

    -- Set the recognition languages to Chinese (Simplified) and English as a fallback
    theRequest's setRecognitionLanguages:({"zh-Hans", "en"})

    -- Perform the request and get the results
    requestHandler's performRequests:(current application's NSArray's arrayWithObject:(theRequest)) |error|:(missing value)
    set theResults to theRequest's results()

    -- Obtain and return the string values of the results
    set theText to {}
    repeat with observation in theResults
        copy ((first item in (observation's topCandidates:1))'s |string|() as text) to end of theText
    end repeat
    return theText
end getImageText

on run(argv)
    if (count of argv) is 0 then error "Must provide an image path"
    getImageText(item 1 of argv)
end run
